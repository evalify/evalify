import { db } from "@/db";
import { eq } from "drizzle-orm";
import { bankQuestionsTable, questionsTable, topicQuestionsTable } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { z } from "zod";

// Validation schemas for different question types with nested data/version structure

const mcqQuestionDataSchema = z.object({
    data: z.object({
        options: z.array(
            z.object({
                id: z.string(),
                optionText: z.string(),
                orderIndex: z.number(),
                image: z.string().optional(),
            })
        ),
    }),
    version: z.number().default(1),
});

const mcqSolutionSchema = z.object({
    data: z.object({
        correctOptions: z.array(
            z.object({
                id: z.string(),
                isCorrect: z.boolean(),
            })
        ),
    }),
    version: z.number().default(1),
});

const trueFalseQuestionDataSchema = z.object({
    data: z.object({}),
    version: z.number().default(1),
});

const trueFalseSolutionSchema = z.object({
    data: z.object({
        trueFalseAnswer: z.boolean(),
    }),
    version: z.number().default(1),
});

const descriptiveQuestionDataSchema = z.object({
    data: z.object({
        config: z
            .object({
                maxWords: z.number().optional(),
                minWords: z.number().optional(),
            })
            .optional()
            .default({}),
    }),
    version: z.number().default(1),
});

const descriptiveSolutionSchema = z.object({
    data: z.object({
        modelAnswer: z.string().optional().default(""),
        keywords: z.array(z.string()).optional().default([]),
    }),
    version: z.number().default(1),
});

const fillTheBlankQuestionDataSchema = z.object({
    data: z.object({
        blanks: z.array(
            z.object({
                position: z.number(),
                correctAnswers: z.array(z.string()),
            })
        ),
    }),
    version: z.number().default(1),
});

const matchingQuestionDataSchema = z.object({
    data: z.object({
        leftItems: z.array(z.string()),
        rightItems: z.array(z.string()),
        correctMatches: z.array(
            z.object({
                left: z.number(),
                right: z.number(),
            })
        ),
    }),
    version: z.number().default(1),
});

const fileUploadQuestionDataSchema = z.object({
    data: z.object({
        allowedFileTypes: z.array(z.string()),
        maxFileSize: z.number(),
        maxFiles: z.number(),
    }),
    version: z.number().default(1),
});

const codingQuestionDataSchema = z.object({
    data: z.object({
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
    }),
    version: z.number().default(1),
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
    courseOutcome: z
        .union([z.enum(["CO1", "CO2", "CO3", "CO4", "CO5", "CO6", "CO7", "CO8"]), z.literal("")])
        .optional()
        .transform((v) => (v === "" ? null : v)),
    bloomTaxonomyLevel: z
        .union([
            z.enum(["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"]),
            z.literal(""),
        ])
        .optional()
        .transform((v) => (v === "" ? null : v)),
    explanation: z
        .string()
        .max(10000)
        .optional()
        .transform((val) => (val === "" ? null : val)),
    solution: z.any(),
    orderIndex: z.number().optional(),
    topics: z.array(z.uuid()).optional().default([]),
});

// Complete question schema with discriminated union
const createQuestionSchema = z.discriminatedUnion("type", [
    baseQuestionSchema.extend({
        type: z.literal("MCQ"),
        questionData: mcqQuestionDataSchema,
        solution: mcqSolutionSchema,
        createdById: z.string(),
    }),
    baseQuestionSchema.extend({
        type: z.literal("MMCQ"),
        questionData: mcqQuestionDataSchema,
        solution: mcqSolutionSchema,
        createdById: z.string(),
    }),
    baseQuestionSchema.extend({
        type: z.literal("TRUE_FALSE"),
        questionData: trueFalseQuestionDataSchema,
        solution: trueFalseSolutionSchema,
        createdById: z.string(),
    }),
    baseQuestionSchema.extend({
        type: z.literal("DESCRIPTIVE"),
        questionData: descriptiveQuestionDataSchema,
        solution: descriptiveSolutionSchema,
        createdById: z.string(),
    }),
    baseQuestionSchema.extend({
        type: z.literal("FILL_THE_BLANK"),
        questionData: fillTheBlankQuestionDataSchema,
        solution: z.any(), // Define proper solution schema if needed
        createdById: z.string(),
    }),
    baseQuestionSchema.extend({
        type: z.literal("MATCHING"),
        questionData: matchingQuestionDataSchema,
        solution: z.any(), // Define proper solution schema if needed
        createdById: z.string(),
    }),
    baseQuestionSchema.extend({
        type: z.literal("FILE_UPLOAD"),
        questionData: fileUploadQuestionDataSchema,
        solution: z.any(), // Define proper solution schema if needed
        createdById: z.string(),
    }),
    baseQuestionSchema.extend({
        type: z.literal("CODING"),
        questionData: codingQuestionDataSchema,
        solution: z.any(), // Define proper solution schema if needed
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
                    orderIndex: questionData.orderIndex || null,
                })
                .returning();

            // Link question to topics if provided
            let topicLinks: (typeof topicQuestionsTable.$inferSelect)[] = [];
            if (questionData.topics && questionData.topics.length > 0) {
                topicLinks = await tx
                    .insert(topicQuestionsTable)
                    .values(
                        questionData.topics.map((topicId) => ({
                            topicId,
                            questionId: newQuestion.id,
                        }))
                    )
                    .returning();
            }

            return { question: newQuestion, bankQuestion, topicLinks };
        });

        logger.info(
            {
                questionId: result.question.id,
                bankId,
                type: questionData.type,
                userId: questionData.createdById,
                topicsCount: questionData.topics?.length || 0,
            },
            "Question created successfully"
        );

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        logger.error({ error, bankId: (await params).bankId }, "Failed to create question");
        return NextResponse.json({ error: "Failed to create question" }, { status: 500 });
    }
}
