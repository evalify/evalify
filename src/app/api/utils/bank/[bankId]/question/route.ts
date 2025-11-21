import { db } from "@/db";
import { eq } from "drizzle-orm";
import { bankQuestionsTable, questionsTable } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { z } from "zod";

// Validation schemas for different question types
const mcqQuestionDataSchema = z.object({
    options: z.array(
        z.object({
            text: z.string(),
            isCorrect: z.boolean(),
            image: z.string().optional(),
        })
    ),
    correctAnswers: z.array(z.number()),
});

const trueFalseQuestionDataSchema = z.object({
    correctAnswer: z.boolean(),
});

const fillTheBlankQuestionDataSchema = z.object({
    blanks: z.array(
        z.object({
            position: z.number(),
            correctAnswers: z.array(z.string()),
        })
    ),
});

const matchingQuestionDataSchema = z.object({
    leftItems: z.array(z.string()),
    rightItems: z.array(z.string()),
    correctMatches: z.array(
        z.object({
            left: z.number(),
            right: z.number(),
        })
    ),
});

const fileUploadQuestionDataSchema = z.object({
    allowedFileTypes: z.array(z.string()),
    maxFileSize: z.number(),
    maxFiles: z.number(),
});

const codingQuestionDataSchema = z.object({
    language: z.string(),
    starterCode: z.string().optional(),
    testCases: z.array(
        z.object({
            input: z.string(),
            expectedOutput: z.string(),
            isHidden: z.boolean().optional(),
        })
    ),
    constraints: z
        .object({
            timeLimit: z.number().optional(),
            memoryLimit: z.number().optional(),
        })
        .optional(),
});

const descriptiveQuestionDataSchema = z.object({
    expectedLength: z.number().optional(),
    keywords: z.array(z.string()).optional(),
});

// Base question schema
const baseQuestionSchema = z.object({
    type: z.enum([
        "MCQ",
        "MMCQ",
        "TRUE_FALSE",
        "DESCRIPTIVE",
        "FILL_THE_BLANK",
        "MATCHING",
        "FILE_UPLOAD",
        "CODING",
    ]),
    question: z.string().min(1).max(5000),
    marks: z.number().positive().default(1),
    negativeMarks: z.number().min(0).default(0),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
    courseOutcome: z.enum(["CO1", "CO2", "CO3", "CO4", "CO5", "CO6", "CO7", "CO8"]).optional(),
    bloomTaxonomyLevel: z
        .enum(["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"])
        .optional(),
    explanation: z.string().max(5000).optional(),
    solution: z.any(),
    orderIndex: z.number().optional(),
});

// Complete question schema with discriminated union
const createQuestionSchema = z.discriminatedUnion("type", [
    baseQuestionSchema.extend({
        type: z.literal("MCQ"),
        questionData: mcqQuestionDataSchema,
        createdById: z.string(),
    }),
    baseQuestionSchema.extend({
        type: z.literal("MMCQ"),
        questionData: mcqQuestionDataSchema,
        createdById: z.string(),
    }),
    baseQuestionSchema.extend({
        type: z.literal("TRUE_FALSE"),
        questionData: trueFalseQuestionDataSchema,
        createdById: z.string(),
    }),
    baseQuestionSchema.extend({
        type: z.literal("DESCRIPTIVE"),
        questionData: descriptiveQuestionDataSchema,
        createdById: z.string(),
    }),
    baseQuestionSchema.extend({
        type: z.literal("FILL_THE_BLANK"),
        questionData: fillTheBlankQuestionDataSchema,
        createdById: z.string(),
    }),
    baseQuestionSchema.extend({
        type: z.literal("MATCHING"),
        questionData: matchingQuestionDataSchema,
        createdById: z.string(),
    }),
    baseQuestionSchema.extend({
        type: z.literal("FILE_UPLOAD"),
        questionData: fileUploadQuestionDataSchema,
        createdById: z.string(),
    }),
    baseQuestionSchema.extend({
        type: z.literal("CODING"),
        questionData: codingQuestionDataSchema,
        createdById: z.string(),
    }),
]);

export async function GET(req: NextRequest, { params }: { params: Promise<{ bankId: string }> }) {
    try {
        const { bankId } = await params;

        const bankQuestions = await db
            .select()
            .from(bankQuestionsTable)
            .rightJoin(questionsTable, eq(bankQuestionsTable.questionId, questionsTable.id))
            .where(eq(bankQuestionsTable.bankId, bankId));

        return NextResponse.json({ questions: bankQuestions });
    } catch (error) {
        logger.error({ error, bankId: (await params).bankId }, "Failed to fetch bank questions");
        return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ bankId: string }> }) {
    try {
        const { bankId } = await params;
        const body = await req.json();

        // Validate request body
        const validationResult = createQuestionSchema.safeParse(body);
        if (!validationResult.success) {
            logger.warn({ errors: validationResult.error.message }, "Question validation failed");
            return NextResponse.json(
                {
                    error: "Invalid question data",
                    details: validationResult.error.message,
                },
                { status: 400 }
            );
        }

        const questionData = validationResult.data;

        // Create question in transaction
        const result = await db.transaction(async (tx) => {
            // Insert question
            const [newQuestion] = await tx
                .insert(questionsTable)
                .values({
                    type: questionData.type,
                    question: questionData.question,
                    questionData: questionData.questionData,
                    solution: questionData.solution,
                    marks: questionData.marks,
                    negativeMarks: questionData.negativeMarks,
                    difficulty: questionData.difficulty,
                    courseOutcome: questionData.courseOutcome,
                    bloomTaxonomyLevel: questionData.bloomTaxonomyLevel,
                    explanation: questionData.explanation,
                    createdById: questionData.createdById,
                })
                .returning();

            // Link question to bank
            const [bankQuestion] = await tx
                .insert(bankQuestionsTable)
                .values({
                    bankId,
                    questionId: newQuestion.id,
                    orderIndex: questionData.orderIndex,
                })
                .returning();

            return { question: newQuestion, bankQuestion };
        });

        logger.info(
            {
                questionId: result.question.id,
                bankId,
                type: questionData.type,
                userId: questionData.createdById,
            },
            "Question created successfully"
        );

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        logger.error({ error, bankId: (await params).bankId }, "Failed to create question");
        return NextResponse.json({ error: "Failed to create question" }, { status: 500 });
    }
}
