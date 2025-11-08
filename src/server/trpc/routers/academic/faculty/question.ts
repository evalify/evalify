import { z } from "zod";
import { createTRPCRouter, createCustomProcedure } from "@/server/trpc/trpc";
import { UserType } from "@/lib/auth/utils";
import { db } from "@/db";
import {
    questionsTable,
    bankQuestionsTable,
    banksTable,
    bankUsersTable,
    topicsTable,
    topicQuestionsTable,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";

const managerOrFacultyProcedure = createCustomProcedure([UserType.MANAGER, UserType.STAFF]);

const questionTypeEnum = z.enum([
    "MCQ",
    "MMCQ",
    "TRUE_FALSE",
    "DESCRIPTIVE",
    "FILL_THE_BLANK",
    "MATCHING",
    "FILE_UPLOAD",
    "CODING",
]);

const difficultyEnum = z.enum(["EASY", "MEDIUM", "HARD"]);
const courseOutcomeEnum = z.enum(["CO1", "CO2", "CO3", "CO4", "CO5", "CO6", "CO7", "CO8"]);
const bloomTaxonomyEnum = z.enum([
    "REMEMBER",
    "UNDERSTAND",
    "APPLY",
    "ANALYZE",
    "EVALUATE",
    "CREATE",
]);

const questionOptionSchema = z.object({
    id: z.string(),
    optionText: z.string(),
    orderIndex: z.number(),
    marksWeightage: z.number().optional(),
});

const baseQuestionSchema = z.object({
    type: questionTypeEnum,
    question: z.string().min(1),
    marks: z.number().positive(),
    negativeMarks: z.number().min(0).default(0),
    difficulty: difficultyEnum.optional(),
    courseOutcome: courseOutcomeEnum.optional(),
    bloomTaxonomyLevel: bloomTaxonomyEnum.optional(),
    topicIds: z.array(z.string().uuid()).optional(),
});

const mcqDataSchema = z.object({
    options: z.array(questionOptionSchema).min(2),
});

const mmcqDataSchema = z.object({
    options: z.array(questionOptionSchema).min(2),
});

const mcqSolutionSchema = z.object({
    correctOptions: z
        .array(
            z.object({
                id: z.string(),
                isCorrect: z.boolean(),
            })
        )
        .min(1),
});

const mmcqSolutionSchema = z.object({
    correctOptions: z
        .array(
            z.object({
                id: z.string(),
                isCorrect: z.boolean(),
            })
        )
        .min(1),
});

export const questionRouter = createTRPCRouter({
    listByBank: managerOrFacultyProcedure
        .input(
            z.object({
                bankId: z.string().uuid(),
                limit: z.number().min(1).max(100).default(50),
                offset: z.number().min(0).default(0),
            })
        )
        .query(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                const [bank] = await db
                    .select({ createdById: banksTable.createdById })
                    .from(banksTable)
                    .where(eq(banksTable.id, input.bankId))
                    .limit(1);

                if (!bank) {
                    throw new Error("Bank not found");
                }

                const hasAccess =
                    bank.createdById === userId ||
                    (
                        await db
                            .select()
                            .from(bankUsersTable)
                            .where(
                                and(
                                    eq(bankUsersTable.bankId, input.bankId),
                                    eq(bankUsersTable.userId, userId)
                                )
                            )
                            .limit(1)
                    ).length > 0;

                if (!hasAccess) {
                    throw new Error("You do not have access to this bank");
                }

                const questions = await db
                    .select({
                        id: questionsTable.id,
                        type: questionsTable.type,
                        question: questionsTable.question,
                        marks: questionsTable.marks,
                        negativeMarks: questionsTable.negativeMarks,
                        difficulty: questionsTable.difficulty,
                        courseOutcome: questionsTable.courseOutcome,
                        bloomTaxonomyLevel: questionsTable.bloomTaxonomyLevel,
                        questionData: questionsTable.questionData,
                        solution: questionsTable.solution,
                        createdAt: questionsTable.created_at,
                        orderIndex: bankQuestionsTable.orderIndex,
                    })
                    .from(questionsTable)
                    .innerJoin(
                        bankQuestionsTable,
                        eq(questionsTable.id, bankQuestionsTable.questionId)
                    )
                    .where(eq(bankQuestionsTable.bankId, input.bankId))
                    .orderBy(desc(questionsTable.created_at))
                    .limit(input.limit)
                    .offset(input.offset);

                logger.info({ bankId: input.bankId, count: questions.length }, "Questions listed");

                return questions;
            } catch (error) {
                logger.error({ error, bankId: input.bankId }, "Error listing questions");
                throw error;
            }
        }),

    getById: managerOrFacultyProcedure
        .input(
            z.object({
                questionId: z.string().uuid(),
                bankId: z.string().uuid().optional(),
            })
        )
        .query(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                const [question] = await db
                    .select({
                        id: questionsTable.id,
                        type: questionsTable.type,
                        question: questionsTable.question,
                        marks: questionsTable.marks,
                        negativeMarks: questionsTable.negativeMarks,
                        difficulty: questionsTable.difficulty,
                        courseOutcome: questionsTable.courseOutcome,
                        bloomTaxonomyLevel: questionsTable.bloomTaxonomyLevel,
                        questionData: questionsTable.questionData,
                        solution: questionsTable.solution,
                        createdById: questionsTable.createdById,
                        createdAt: questionsTable.created_at,
                    })
                    .from(questionsTable)
                    .where(eq(questionsTable.id, input.questionId))
                    .limit(1);

                if (!question) {
                    throw new Error("Question not found");
                }

                if (input.bankId) {
                    const [bank] = await db
                        .select({ createdById: banksTable.createdById })
                        .from(banksTable)
                        .where(eq(banksTable.id, input.bankId))
                        .limit(1);

                    if (!bank) {
                        throw new Error("Bank not found");
                    }

                    const hasAccess =
                        bank.createdById === userId ||
                        (
                            await db
                                .select()
                                .from(bankUsersTable)
                                .where(
                                    and(
                                        eq(bankUsersTable.bankId, input.bankId),
                                        eq(bankUsersTable.userId, userId)
                                    )
                                )
                                .limit(1)
                        ).length > 0;

                    if (!hasAccess) {
                        throw new Error("You do not have access to this bank");
                    }
                }

                const topicLinks = await db
                    .select({
                        topicId: topicQuestionsTable.topicId,
                        topicName: topicsTable.name,
                    })
                    .from(topicQuestionsTable)
                    .innerJoin(topicsTable, eq(topicQuestionsTable.topicId, topicsTable.id))
                    .where(eq(topicQuestionsTable.questionId, input.questionId));

                logger.info({ questionId: input.questionId }, "Question retrieved");

                return {
                    ...question,
                    topics: topicLinks,
                };
            } catch (error) {
                logger.error({ error, questionId: input.questionId }, "Error getting question");
                throw error;
            }
        }),

    createForBank: managerOrFacultyProcedure
        .input(
            baseQuestionSchema.and(
                z.discriminatedUnion("type", [
                    z.object({
                        type: z.literal("MCQ"),
                        questionData: mcqDataSchema,
                        solution: mcqSolutionSchema,
                    }),
                    z.object({
                        type: z.literal("MMCQ"),
                        questionData: mmcqDataSchema,
                        solution: mmcqSolutionSchema,
                    }),
                ])
            )
        )
        .input(z.object({ bankId: z.string().uuid() }))
        .mutation(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                const [bank] = await db
                    .select({ createdById: banksTable.createdById })
                    .from(banksTable)
                    .where(eq(banksTable.id, input.bankId))
                    .limit(1);

                if (!bank) {
                    throw new Error("Bank not found");
                }

                const [accessRecord] = await db
                    .select({ accessLevel: bankUsersTable.accessLevel })
                    .from(bankUsersTable)
                    .where(
                        and(
                            eq(bankUsersTable.bankId, input.bankId),
                            eq(bankUsersTable.userId, userId)
                        )
                    )
                    .limit(1);

                const hasWriteAccess =
                    bank.createdById === userId || accessRecord?.accessLevel === "WRITE";

                if (!hasWriteAccess) {
                    throw new Error("You do not have permission to add questions to this bank");
                }

                const [question] = await db
                    .insert(questionsTable)
                    .values({
                        type: input.type,
                        question: input.question,
                        marks: input.marks,
                        negativeMarks: input.negativeMarks,
                        difficulty: input.difficulty,
                        courseOutcome: input.courseOutcome,
                        bloomTaxonomyLevel: input.bloomTaxonomyLevel,
                        questionData: input.questionData,
                        solution: input.solution,
                        createdById: userId,
                    })
                    .returning();

                await db.insert(bankQuestionsTable).values({
                    bankId: input.bankId,
                    questionId: question.id,
                    orderIndex: null,
                });

                if (input.topicIds && input.topicIds.length > 0) {
                    await db.insert(topicQuestionsTable).values(
                        input.topicIds.map((topicId) => ({
                            questionId: question.id,
                            topicId,
                        }))
                    );
                }

                logger.info(
                    {
                        questionId: question.id,
                        bankId: input.bankId,
                        type: input.type,
                        userId,
                    },
                    "Question created for bank"
                );

                return question;
            } catch (error) {
                logger.error({ error, input }, "Error creating question");
                throw new Error("Failed to create question. Please try again.");
            }
        }),

    update: managerOrFacultyProcedure
        .input(
            z
                .object({
                    questionId: z.string().uuid(),
                    bankId: z.string().uuid().optional(),
                })
                .and(
                    baseQuestionSchema.partial().and(
                        z.discriminatedUnion("type", [
                            z.object({
                                type: z.literal("MCQ"),
                                questionData: mcqDataSchema.optional(),
                                solution: mcqSolutionSchema.optional(),
                            }),
                            z.object({
                                type: z.literal("MMCQ"),
                                questionData: mmcqDataSchema.optional(),
                                solution: mmcqSolutionSchema.optional(),
                            }),
                        ])
                    )
                )
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                const [existing] = await db
                    .select({ createdById: questionsTable.createdById })
                    .from(questionsTable)
                    .where(eq(questionsTable.id, input.questionId))
                    .limit(1);

                if (!existing) {
                    throw new Error("Question not found");
                }

                if (input.bankId) {
                    const [bank] = await db
                        .select({ createdById: banksTable.createdById })
                        .from(banksTable)
                        .where(eq(banksTable.id, input.bankId))
                        .limit(1);

                    if (!bank) {
                        throw new Error("Bank not found");
                    }

                    const [accessRecord] = await db
                        .select({ accessLevel: bankUsersTable.accessLevel })
                        .from(bankUsersTable)
                        .where(
                            and(
                                eq(bankUsersTable.bankId, input.bankId),
                                eq(bankUsersTable.userId, userId)
                            )
                        )
                        .limit(1);

                    const hasWriteAccess =
                        bank.createdById === userId ||
                        accessRecord?.accessLevel === "WRITE" ||
                        existing.createdById === userId;

                    if (!hasWriteAccess) {
                        throw new Error("You do not have permission to edit this question");
                    }
                }

                const updateData: Partial<typeof questionsTable.$inferInsert> = {};
                if (input.type !== undefined) updateData.type = input.type;
                if (input.question !== undefined) updateData.question = input.question;
                if (input.marks !== undefined) updateData.marks = input.marks;
                if (input.negativeMarks !== undefined)
                    updateData.negativeMarks = input.negativeMarks;
                if (input.difficulty !== undefined) updateData.difficulty = input.difficulty;
                if (input.courseOutcome !== undefined)
                    updateData.courseOutcome = input.courseOutcome;
                if (input.bloomTaxonomyLevel !== undefined)
                    updateData.bloomTaxonomyLevel = input.bloomTaxonomyLevel;
                if (input.questionData !== undefined) updateData.questionData = input.questionData;
                if (input.solution !== undefined) updateData.solution = input.solution;

                const [question] = await db
                    .update(questionsTable)
                    .set(updateData)
                    .where(eq(questionsTable.id, input.questionId))
                    .returning();

                if (input.topicIds !== undefined) {
                    await db
                        .delete(topicQuestionsTable)
                        .where(eq(topicQuestionsTable.questionId, input.questionId));

                    if (input.topicIds.length > 0) {
                        await db.insert(topicQuestionsTable).values(
                            input.topicIds.map((topicId) => ({
                                questionId: input.questionId,
                                topicId,
                            }))
                        );
                    }
                }

                logger.info({ questionId: input.questionId, userId }, "Question updated");

                return question;
            } catch (error) {
                logger.error({ error, questionId: input.questionId }, "Error updating question");
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error("Failed to update question. Please try again.");
            }
        }),

    delete: managerOrFacultyProcedure
        .input(
            z.object({
                questionId: z.string().uuid(),
                bankId: z.string().uuid().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                const [existing] = await db
                    .select({ createdById: questionsTable.createdById })
                    .from(questionsTable)
                    .where(eq(questionsTable.id, input.questionId))
                    .limit(1);

                if (!existing) {
                    throw new Error("Question not found");
                }

                if (input.bankId) {
                    const [bank] = await db
                        .select({ createdById: banksTable.createdById })
                        .from(banksTable)
                        .where(eq(banksTable.id, input.bankId))
                        .limit(1);

                    if (!bank) {
                        throw new Error("Bank not found");
                    }

                    const hasDeleteAccess = bank.createdById === userId;

                    if (!hasDeleteAccess && existing.createdById !== userId) {
                        throw new Error("Only the bank owner or question creator can delete");
                    }
                }

                await db.delete(questionsTable).where(eq(questionsTable.id, input.questionId));

                logger.info({ questionId: input.questionId, userId }, "Question deleted");

                return { success: true, id: input.questionId };
            } catch (error) {
                logger.error({ error, questionId: input.questionId }, "Error deleting question");
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error("Failed to delete question. Please try again.");
            }
        }),
});
