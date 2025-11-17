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
    quizQuestionsTable,
    courseQuizzesTable,
    courseInstructorsTable,
} from "@/db/schema";
import { eq, and, desc, inArray, sql, isNull } from "drizzle-orm";
import { logger } from "@/lib/logger";
import {
    versionMCQData,
    versionMCQSolution,
    versionMMCQData,
    versionMMCQSolution,
    versionTrueFalseSolution,
    versionMatchingData,
    versionMatchingSolution,
    versionFillTheBlankData,
    versionFillTheBlankSolution,
    versionDescriptiveData,
    versionDescriptiveSolution,
    QUESTION_VERSIONS,
    unwrapVersion,
} from "@/lib/versioning/question-versioning";
import { QuestionType, type Question } from "@/types/questions";

const managerOrFacultyProcedure = createCustomProcedure([UserType.MANAGER, UserType.STAFF]);

// Type definitions for database query results
type TopicLink = {
    topicId: string;
    topicName: string;
};

type TrueFalseSolution = {
    trueFalseAnswer?: boolean;
    explanation?: string;
};

type FillBlankData = {
    config?: Record<string, unknown>;
};

type FillBlankSolution = {
    acceptableAnswers?: unknown;
};

type DescriptiveData = {
    config?: Record<string, unknown>;
};

type DescriptiveSolution = {
    modelAnswer?: string;
    keywords?: string[];
};

type MatchingData = {
    options?: Array<Record<string, unknown>>;
};

type MatchingSolution = {
    options?: Array<{ id: string; matchPairIds?: string[] }>;
};

// Type for transformed question with topics and unwrapped data
// Using Record to allow flexible properties for different question types
type TransformedQuestion = Record<string, unknown>;

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
    difficulty: difficultyEnum.nullish(),
    courseOutcome: courseOutcomeEnum.nullish(),
    bloomTaxonomyLevel: bloomTaxonomyEnum.nullish(),
    topicIds: z.array(z.uuid()).nullish(),
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

const fillTheBlankConfigSchema = z.object({
    blankCount: z.number(),
    acceptableAnswers: z.record(
        z.string(),
        z.object({
            answers: z.array(z.string()),
            type: z.enum(["TEXT", "NUMBER", "UPPERCASE", "LOWERCASE"]),
        })
    ),
    blankWeights: z.record(z.string(), z.number()),
    evaluationType: z.enum(["NORMAL", "STRICT", "HYBRID"]),
});

const descriptiveConfigSchema = z
    .object({
        modelAnswer: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        minWords: z.number().int().nonnegative().optional(),
        maxWords: z.number().int().nonnegative().optional(),
    })
    .refine(
        (data) => {
            if (data.minWords !== undefined && data.maxWords !== undefined) {
                return data.minWords <= data.maxWords;
            }
            return true;
        },
        {
            message: "Minimum words must be less than or equal to maximum words",
            path: ["minWords"],
        }
    );

const matchOptionsSchema = z.object({
    id: z.string(),
    isLeft: z.boolean(),
    text: z.string(),
    orderIndex: z.number(),
    matchPairIds: z.array(z.string()).optional(),
});

export const questionRouter = createTRPCRouter({
    listByTopics: managerOrFacultyProcedure
        .input(
            z.object({
                bankId: z.string().uuid(),
                topicIds: z.array(z.string().uuid()),
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

                // If no topics selected, get all questions from the bank
                let questions;
                if (input.topicIds.length === 0) {
                    questions = await db
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
                            bankQuestionId: bankQuestionsTable.id,
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
                } else {
                    // Get questions that belong to any of the selected topics
                    questions = await db
                        .selectDistinct({
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
                            bankQuestionId: bankQuestionsTable.id,
                        })
                        .from(questionsTable)
                        .innerJoin(
                            bankQuestionsTable,
                            eq(questionsTable.id, bankQuestionsTable.questionId)
                        )
                        .innerJoin(
                            topicQuestionsTable,
                            eq(questionsTable.id, topicQuestionsTable.questionId)
                        )
                        .where(
                            and(
                                eq(bankQuestionsTable.bankId, input.bankId),
                                inArray(topicQuestionsTable.topicId, input.topicIds)
                            )
                        )
                        .orderBy(desc(questionsTable.created_at))
                        .limit(input.limit)
                        .offset(input.offset);
                }

                // Fetch topics for each question
                const questionsWithTopics = await Promise.all(
                    questions.map(async (question): Promise<Question> => {
                        const topics: TopicLink[] = await db
                            .select({
                                topicId: topicQuestionsTable.topicId,
                                topicName: topicsTable.name,
                            })
                            .from(topicQuestionsTable)
                            .innerJoin(topicsTable, eq(topicQuestionsTable.topicId, topicsTable.id))
                            .where(eq(topicQuestionsTable.questionId, question.id));

                        // Unwrap versioned data
                        let unwrappedQuestionData: unknown = question.questionData;
                        let unwrappedSolution: unknown = question.solution;

                        if (
                            question.questionData &&
                            typeof question.questionData === "object" &&
                            "version" in question.questionData
                        ) {
                            unwrappedQuestionData = unwrapVersion(question.questionData as never);
                        }

                        if (
                            question.solution &&
                            typeof question.solution === "object" &&
                            "version" in question.solution
                        ) {
                            unwrappedSolution = unwrapVersion(question.solution as never);
                        }

                        // Transform based on type
                        const transformed: TransformedQuestion = {
                            ...question,
                            topics,
                        };

                        if (question.type === "MCQ" || question.type === "MMCQ") {
                            transformed.questionData = unwrappedQuestionData;
                            transformed.solution = unwrappedSolution;
                        } else if (question.type === "TRUE_FALSE") {
                            const solutionData = unwrappedSolution as TrueFalseSolution;
                            transformed.trueFalseAnswer = solutionData?.trueFalseAnswer;
                            transformed.explanation = solutionData?.explanation;
                        } else if (question.type === "FILL_THE_BLANK") {
                            const data = unwrappedQuestionData as FillBlankData;
                            const solution = unwrappedSolution as FillBlankSolution;
                            transformed.blankConfig = {
                                ...data.config,
                                acceptableAnswers: solution.acceptableAnswers,
                            };
                        } else if (question.type === "DESCRIPTIVE") {
                            const data = unwrappedQuestionData as DescriptiveData;
                            const solution = unwrappedSolution as DescriptiveSolution;
                            transformed.descriptiveConfig = {
                                ...data.config,
                                modelAnswer: solution.modelAnswer,
                                keywords: solution.keywords,
                            };
                        } else if (question.type === "MATCHING") {
                            const data = unwrappedQuestionData as MatchingData;
                            const solution = unwrappedSolution as MatchingSolution;

                            if (data.options && solution.options) {
                                transformed.options = data.options.map((opt) => {
                                    const solutionOpt = solution.options?.find(
                                        (s) => s.id === opt.id
                                    );
                                    return {
                                        ...opt,
                                        matchPairIds: solutionOpt?.matchPairIds,
                                    };
                                });
                            }
                        }

                        return transformed as unknown as Question;
                    })
                );

                logger.info(
                    {
                        bankId: input.bankId,
                        topicIds: input.topicIds,
                        count: questionsWithTopics.length,
                        bankQuestionIds: questionsWithTopics
                            .map((q) => (q as unknown as TransformedQuestion).bankQuestionId)
                            .filter(Boolean),
                    },
                    "Questions listed by topics"
                );

                return questionsWithTopics;
            } catch (error) {
                logger.error({ error, bankId: input.bankId }, "Error listing questions by topics");
                throw error;
            }
        }),

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

                // Fetch topics for each question and transform data
                const questionsWithTopics = await Promise.all(
                    questions.map(async (question): Promise<Question> => {
                        const topicLinks: TopicLink[] = await db
                            .select({
                                topicId: topicsTable.id,
                                topicName: topicsTable.name,
                            })
                            .from(topicQuestionsTable)
                            .innerJoin(topicsTable, eq(topicQuestionsTable.topicId, topicsTable.id))
                            .where(eq(topicQuestionsTable.questionId, question.id));

                        // Unwrap versioned data for frontend consumption
                        let unwrappedQuestionData: unknown = question.questionData;
                        let unwrappedSolution: unknown = question.solution;

                        if (
                            question.questionData &&
                            typeof question.questionData === "object" &&
                            "version" in question.questionData
                        ) {
                            unwrappedQuestionData = (
                                question.questionData as unknown as { data: unknown }
                            ).data;
                        }

                        if (
                            question.solution &&
                            typeof question.solution === "object" &&
                            "version" in question.solution
                        ) {
                            unwrappedSolution = (question.solution as unknown as { data: unknown })
                                .data;
                        }

                        // Transform data based on question type for frontend
                        const transformedQuestion: TransformedQuestion = {
                            ...question,
                            topics: topicLinks,
                        };

                        if (question.type === "MCQ" || question.type === "MMCQ") {
                            transformedQuestion.questionData = unwrappedQuestionData;
                            transformedQuestion.solution = unwrappedSolution;
                        } else if (question.type === "TRUE_FALSE") {
                            const solutionData = unwrappedSolution as TrueFalseSolution;
                            transformedQuestion.trueFalseAnswer = solutionData?.trueFalseAnswer;
                            transformedQuestion.explanation = solutionData?.explanation;
                        } else if (question.type === "FILL_THE_BLANK") {
                            const data = unwrappedQuestionData as FillBlankData;
                            const solution = unwrappedSolution as FillBlankSolution;
                            transformedQuestion.blankConfig = {
                                ...data.config,
                                acceptableAnswers: solution.acceptableAnswers,
                            };
                            const solutionData = unwrappedSolution as { explanation?: string };
                            transformedQuestion.explanation = solutionData?.explanation;
                        } else if (question.type === "DESCRIPTIVE") {
                            const data = unwrappedQuestionData as DescriptiveData;
                            const solution = unwrappedSolution as DescriptiveSolution;
                            transformedQuestion.descriptiveConfig = {
                                ...data.config,
                                modelAnswer: solution.modelAnswer,
                                keywords: solution.keywords,
                            };
                            const solutionData = unwrappedSolution as { explanation?: string };
                            transformedQuestion.explanation = solutionData?.explanation;
                        } else if (question.type === "MATCHING") {
                            const data = unwrappedQuestionData as MatchingData;
                            const solution = unwrappedSolution as MatchingSolution;
                            if (data.options && solution.options) {
                                transformedQuestion.options = data.options.map((opt) => {
                                    const solutionOpt = solution.options?.find(
                                        (s) => s.id === opt.id
                                    );
                                    return { ...opt, matchPairIds: solutionOpt?.matchPairIds };
                                });
                            }
                            const solutionData = unwrappedSolution as { explanation?: string };
                            transformedQuestion.explanation = solutionData?.explanation;
                        }

                        return transformedQuestion as unknown as Question;
                    })
                );

                logger.info(
                    { bankId: input.bankId, count: questionsWithTopics.length },
                    "Questions listed"
                );

                return questionsWithTopics;
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

                const topicLinks: TopicLink[] = await db
                    .select({
                        topicId: topicQuestionsTable.topicId,
                        topicName: topicsTable.name,
                    })
                    .from(topicQuestionsTable)
                    .innerJoin(topicsTable, eq(topicQuestionsTable.topicId, topicsTable.id))
                    .where(eq(topicQuestionsTable.questionId, input.questionId));

                // Unwrap versioned data for frontend consumption
                let unwrappedQuestionData: unknown = question.questionData;
                let unwrappedSolution: unknown = question.solution;

                if (
                    question.questionData &&
                    typeof question.questionData === "object" &&
                    "version" in question.questionData
                ) {
                    unwrappedQuestionData = unwrapVersion(question.questionData as never);
                }

                if (
                    question.solution &&
                    typeof question.solution === "object" &&
                    "version" in question.solution
                ) {
                    unwrappedSolution = unwrapVersion(question.solution as never);
                }

                // Transform data based on question type for frontend
                const transformedQuestion: TransformedQuestion = {
                    ...question,
                    topics: topicLinks,
                };

                if (question.type === "MCQ" || question.type === "MMCQ") {
                    transformedQuestion.questionData = unwrappedQuestionData;
                    transformedQuestion.solution = unwrappedSolution;
                } else if (question.type === "TRUE_FALSE") {
                    const solutionData = unwrappedSolution as TrueFalseSolution;
                    transformedQuestion.trueFalseAnswer = solutionData?.trueFalseAnswer;
                    transformedQuestion.explanation = solutionData?.explanation;
                } else if (question.type === "FILL_THE_BLANK") {
                    // Merge data and solution back into blankConfig
                    const data = unwrappedQuestionData as FillBlankData;
                    const solution = unwrappedSolution as FillBlankSolution;
                    transformedQuestion.blankConfig = {
                        ...data.config,
                        acceptableAnswers: solution.acceptableAnswers,
                    };
                } else if (question.type === "DESCRIPTIVE") {
                    // Merge data and solution back into descriptiveConfig
                    const data = unwrappedQuestionData as DescriptiveData;
                    const solution = unwrappedSolution as DescriptiveSolution;
                    transformedQuestion.descriptiveConfig = {
                        ...data.config,
                        modelAnswer: solution.modelAnswer,
                        keywords: solution.keywords,
                    };
                } else if (question.type === "MATCHING") {
                    // Merge data and solution back into options
                    const data = unwrappedQuestionData as MatchingData;
                    const solution = unwrappedSolution as MatchingSolution;

                    if (data.options && solution.options) {
                        transformedQuestion.options = data.options.map((opt) => {
                            const solutionOpt = solution.options?.find((s) => s.id === opt.id);
                            return {
                                ...opt,
                                matchPairIds: solutionOpt?.matchPairIds,
                            };
                        });
                    }
                }

                logger.info({ questionId: input.questionId }, "Question retrieved");

                return transformedQuestion as unknown as Question;
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
                        explanation: z.string().optional(),
                    }),
                    z.object({
                        type: z.literal("MMCQ"),
                        questionData: mmcqDataSchema,
                        solution: mmcqSolutionSchema,
                        explanation: z.string().optional(),
                    }),
                    z.object({
                        type: z.literal("TRUE_FALSE"),
                        trueFalseAnswer: z.boolean(),
                        explanation: z.string().optional(),
                    }),
                    z.object({
                        type: z.literal("FILL_THE_BLANK"),
                        blankConfig: fillTheBlankConfigSchema,
                        explanation: z.string().optional(),
                    }),
                    z.object({
                        type: z.literal("DESCRIPTIVE"),
                        descriptiveConfig: descriptiveConfigSchema,
                        explanation: z.string().optional(),
                    }),
                    z.object({
                        type: z.literal("MATCHING"),
                        options: z.array(matchOptionsSchema),
                        explanation: z.string().optional(),
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

                // Prepare question data based on type with versioning
                // All questionData and solution fields are now wrapped with version information
                // Format: { version: number, data: actualData }
                let questionData: unknown;
                let solution: unknown;

                if (input.type === "MCQ") {
                    questionData = versionMCQData(input.questionData);
                    solution = versionMCQSolution(input.solution);
                } else if (input.type === "MMCQ") {
                    questionData = versionMMCQData(input.questionData);
                    solution = versionMMCQSolution(input.solution);
                } else if (input.type === "TRUE_FALSE") {
                    questionData = {
                        version: QUESTION_VERSIONS[QuestionType.TRUE_FALSE].DATA,
                        data: {},
                    };
                    solution = versionTrueFalseSolution({ trueFalseAnswer: input.trueFalseAnswer });
                } else if (input.type === "FILL_THE_BLANK") {
                    // Split blankConfig into data (without acceptableAnswers) and solution (acceptableAnswers only)
                    const { acceptableAnswers, ...dataWithoutAnswers } = input.blankConfig;
                    questionData = versionFillTheBlankData({
                        config: dataWithoutAnswers as never,
                    });
                    solution = versionFillTheBlankSolution({
                        acceptableAnswers: acceptableAnswers as never,
                    });
                } else if (input.type === "DESCRIPTIVE") {
                    // Split descriptiveConfig into data (without modelAnswer/keywords) and solution (modelAnswer/keywords only)
                    const { modelAnswer, keywords, ...dataWithoutSolution } =
                        input.descriptiveConfig;
                    questionData = versionDescriptiveData({
                        config: dataWithoutSolution as never,
                    });
                    solution = versionDescriptiveSolution({
                        modelAnswer,
                        keywords,
                    });
                } else if (input.type === "MATCHING") {
                    // Split options into data (without matchPairIds) and solution (id + matchPairIds only)
                    const optionsData = input.options.map(({ id, isLeft, text, orderIndex }) => ({
                        id,
                        isLeft,
                        text,
                        orderIndex,
                    }));
                    const optionsSolution = input.options.map(({ id, matchPairIds }) => ({
                        id,
                        matchPairIds,
                    }));
                    questionData = versionMatchingData({ options: optionsData as never });
                    solution = versionMatchingSolution({ options: optionsSolution as never });
                }

                logger.info(
                    {
                        type: input.type,
                        hasVersionedData: Boolean(
                            questionData && "version" in (questionData as object)
                        ),
                        hasVersionedSolution: Boolean(
                            solution && "version" in (solution as object)
                        ),
                    },
                    "Creating question with versioned data"
                );

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
                        questionData,
                        solution,
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
                console.error("Full error details:", error);
                if (error instanceof Error) {
                    throw error;
                }
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
                                explanation: z.string().optional(),
                            }),
                            z.object({
                                type: z.literal("MMCQ"),
                                questionData: mmcqDataSchema.optional(),
                                solution: mmcqSolutionSchema.optional(),
                                explanation: z.string().optional(),
                            }),
                            z.object({
                                type: z.literal("TRUE_FALSE"),
                                trueFalseAnswer: z.boolean().optional(),
                                explanation: z.string().optional(),
                            }),
                            z.object({
                                type: z.literal("FILL_THE_BLANK"),
                                blankConfig: fillTheBlankConfigSchema.optional(),
                                explanation: z.string().optional(),
                            }),
                            z.object({
                                type: z.literal("DESCRIPTIVE"),
                                descriptiveConfig: descriptiveConfigSchema.optional(),
                                explanation: z.string().optional(),
                            }),
                            z.object({
                                type: z.literal("MATCHING"),
                                options: z.array(matchOptionsSchema).optional(),
                                explanation: z.string().optional(),
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

                if (input.type === "MCQ") {
                    if ("questionData" in input && input.questionData !== undefined) {
                        updateData.questionData = versionMCQData(input.questionData);
                    }
                    if ("solution" in input && input.solution !== undefined) {
                        updateData.solution = versionMCQSolution(input.solution);
                    }
                } else if (input.type === "MMCQ") {
                    if ("questionData" in input && input.questionData !== undefined) {
                        updateData.questionData = versionMMCQData(input.questionData);
                    }
                    if ("solution" in input && input.solution !== undefined) {
                        updateData.solution = versionMMCQSolution(input.solution);
                    }
                } else if (input.type === "TRUE_FALSE") {
                    if ("trueFalseAnswer" in input && input.trueFalseAnswer !== undefined) {
                        updateData.solution = versionTrueFalseSolution({
                            trueFalseAnswer: input.trueFalseAnswer,
                        });
                    }
                } else if (input.type === "FILL_THE_BLANK") {
                    if ("blankConfig" in input && input.blankConfig !== undefined) {
                        const { acceptableAnswers, ...dataWithoutAnswers } = input.blankConfig;
                        updateData.questionData = versionFillTheBlankData({
                            config: dataWithoutAnswers as never,
                        });
                        updateData.solution = versionFillTheBlankSolution({
                            acceptableAnswers: acceptableAnswers as never,
                        });
                    }
                } else if (input.type === "DESCRIPTIVE") {
                    if ("descriptiveConfig" in input && input.descriptiveConfig !== undefined) {
                        const { modelAnswer, keywords, ...dataWithoutSolution } =
                            input.descriptiveConfig;
                        updateData.questionData = versionDescriptiveData({
                            config: dataWithoutSolution as never,
                        });
                        updateData.solution = versionDescriptiveSolution({
                            modelAnswer,
                            keywords,
                        });
                    }
                } else if (input.type === "MATCHING") {
                    if ("options" in input && input.options !== undefined) {
                        const optionsData = input.options.map(
                            ({ id, isLeft, text, orderIndex }) => ({
                                id,
                                isLeft,
                                text,
                                orderIndex,
                            })
                        );
                        const optionsSolution = input.options.map(({ id, matchPairIds }) => ({
                            id,
                            matchPairIds,
                        }));
                        updateData.questionData = versionMatchingData({
                            options: optionsData as never,
                        });
                        updateData.solution = versionMatchingSolution({
                            options: optionsSolution as never,
                        });
                    }
                }

                const [question] = await db
                    .update(questionsTable)
                    .set(updateData)
                    .where(eq(questionsTable.id, input.questionId))
                    .returning();

                if (input.topicIds !== undefined) {
                    await db
                        .delete(topicQuestionsTable)
                        .where(eq(topicQuestionsTable.questionId, input.questionId));

                    if (input.topicIds && input.topicIds.length > 0) {
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

    createForQuiz: managerOrFacultyProcedure
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
                    z.object({
                        type: z.literal("TRUE_FALSE"),
                        trueFalseAnswer: z.boolean(),
                        explanation: z.string().optional(),
                    }),
                    z.object({
                        type: z.literal("FILL_THE_BLANK"),
                        blankConfig: fillTheBlankConfigSchema,
                        explanation: z.string().optional(),
                    }),
                    z.object({
                        type: z.literal("DESCRIPTIVE"),
                        descriptiveConfig: descriptiveConfigSchema,
                        explanation: z.string().optional(),
                    }),
                    z.object({
                        type: z.literal("MATCHING"),
                        options: z.array(matchOptionsSchema),
                        explanation: z.string().optional(),
                    }),
                ])
            )
        )
        .input(
            z.object({
                quizId: z.string().uuid(),
                courseId: z.string().uuid(),
                sectionId: z.string().uuid().optional().nullable(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                const [quizCourse] = await db
                    .select({ courseId: courseQuizzesTable.courseId })
                    .from(courseQuizzesTable)
                    .where(eq(courseQuizzesTable.quizId, input.quizId))
                    .limit(1);

                if (!quizCourse) {
                    throw new Error("Quiz not found");
                }

                const [accessRecord] = await db
                    .select()
                    .from(courseInstructorsTable)
                    .where(
                        and(
                            eq(courseInstructorsTable.courseId, input.courseId),
                            eq(courseInstructorsTable.instructorId, userId)
                        )
                    )
                    .limit(1);

                if (!accessRecord) {
                    throw new Error("You do not have permission to add questions to this quiz");
                }

                let questionData: unknown;
                let solution: unknown;

                if (input.type === "MCQ") {
                    questionData = versionMCQData(input.questionData);
                    solution = versionMCQSolution(input.solution);
                } else if (input.type === "MMCQ") {
                    questionData = versionMMCQData(input.questionData);
                    solution = versionMMCQSolution(input.solution);
                } else if (input.type === "TRUE_FALSE") {
                    questionData = {
                        version: QUESTION_VERSIONS[QuestionType.TRUE_FALSE].DATA,
                        data: {},
                    };
                    solution = versionTrueFalseSolution({ trueFalseAnswer: input.trueFalseAnswer });
                } else if (input.type === "FILL_THE_BLANK") {
                    const { acceptableAnswers, ...dataWithoutAnswers } = input.blankConfig;
                    questionData = versionFillTheBlankData({
                        config: dataWithoutAnswers as never,
                    });
                    solution = versionFillTheBlankSolution({
                        acceptableAnswers: acceptableAnswers as never,
                    });
                } else if (input.type === "DESCRIPTIVE") {
                    const { modelAnswer, keywords, ...dataWithoutSolution } =
                        input.descriptiveConfig;
                    questionData = versionDescriptiveData({
                        config: dataWithoutSolution as never,
                    });
                    solution = versionDescriptiveSolution({
                        modelAnswer,
                        keywords,
                    });
                } else if (input.type === "MATCHING") {
                    const dataOptions = input.options.map(({ matchPairIds: _, ...opt }) => opt);
                    questionData = versionMatchingData({ options: dataOptions as never });

                    const solutionOptions = input.options.map((opt) => ({
                        id: opt.id,
                        matchPairIds: opt.matchPairIds || [],
                    }));
                    solution = versionMatchingSolution({ options: solutionOptions as never });
                } else {
                    throw new Error("Unsupported question type");
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
                        questionData,
                        solution,
                        createdById: userId,
                    })
                    .returning();

                const [lastQuestion] = await db
                    .select({ orderIndex: quizQuestionsTable.orderIndex })
                    .from(quizQuestionsTable)
                    .where(eq(quizQuestionsTable.quizId, input.quizId))
                    .orderBy(desc(quizQuestionsTable.orderIndex))
                    .limit(1);

                const nextOrderIndex = lastQuestion ? lastQuestion.orderIndex + 1 : 0;

                await db.insert(quizQuestionsTable).values({
                    quizId: input.quizId,
                    questionId: question.id,
                    orderIndex: nextOrderIndex,
                    sectionId: input.sectionId || null,
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
                        quizId: input.quizId,
                        type: input.type,
                        userId,
                    },
                    "Question created for quiz"
                );

                return question;
            } catch (error) {
                logger.error({ error, input }, "Error creating question for quiz");
                console.error("Full error details:", error);
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error("Failed to create question. Please try again.");
            }
        }),

    getByIdForQuiz: managerOrFacultyProcedure
        .input(
            z.object({
                questionId: z.string().uuid(),
                quizId: z.string().uuid(),
                courseId: z.string().uuid(),
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

                const [quizCourse] = await db
                    .select({ courseId: courseQuizzesTable.courseId })
                    .from(courseQuizzesTable)
                    .where(eq(courseQuizzesTable.quizId, input.quizId))
                    .limit(1);

                if (!quizCourse) {
                    throw new Error("Quiz not found");
                }

                const [accessRecord] = await db
                    .select()
                    .from(courseInstructorsTable)
                    .where(
                        and(
                            eq(courseInstructorsTable.courseId, input.courseId),
                            eq(courseInstructorsTable.instructorId, userId)
                        )
                    )
                    .limit(1);

                if (!accessRecord) {
                    throw new Error("You do not have access to this quiz");
                }

                const topicLinks: TopicLink[] = await db
                    .select({
                        topicId: topicQuestionsTable.topicId,
                        topicName: topicsTable.name,
                    })
                    .from(topicQuestionsTable)
                    .innerJoin(topicsTable, eq(topicQuestionsTable.topicId, topicsTable.id))
                    .where(eq(topicQuestionsTable.questionId, input.questionId));

                let unwrappedQuestionData: unknown = question.questionData;
                let unwrappedSolution: unknown = question.solution;

                if (
                    question.questionData &&
                    typeof question.questionData === "object" &&
                    "version" in question.questionData
                ) {
                    unwrappedQuestionData = unwrapVersion(question.questionData as never);
                }

                if (
                    question.solution &&
                    typeof question.solution === "object" &&
                    "version" in question.solution
                ) {
                    unwrappedSolution = unwrapVersion(question.solution as never);
                }

                const transformedQuestion: TransformedQuestion = {
                    ...question,
                    topics: topicLinks,
                };

                if (question.type === "MCQ" || question.type === "MMCQ") {
                    transformedQuestion.questionData = unwrappedQuestionData;
                    transformedQuestion.solution = unwrappedSolution;
                } else if (question.type === "TRUE_FALSE") {
                    const solutionData = unwrappedSolution as TrueFalseSolution;
                    transformedQuestion.trueFalseAnswer = solutionData?.trueFalseAnswer;
                    transformedQuestion.explanation = solutionData?.explanation;
                } else if (question.type === "FILL_THE_BLANK") {
                    const data = unwrappedQuestionData as FillBlankData;
                    const solution = unwrappedSolution as FillBlankSolution;
                    transformedQuestion.blankConfig = {
                        ...data.config,
                        acceptableAnswers: solution.acceptableAnswers,
                    };
                } else if (question.type === "DESCRIPTIVE") {
                    const data = unwrappedQuestionData as DescriptiveData;
                    const solution = unwrappedSolution as DescriptiveSolution;
                    transformedQuestion.descriptiveConfig = {
                        ...data.config,
                        modelAnswer: solution.modelAnswer,
                        keywords: solution.keywords,
                    };
                } else if (question.type === "MATCHING") {
                    const data = unwrappedQuestionData as MatchingData;
                    const solution = unwrappedSolution as MatchingSolution;

                    if (data.options && solution.options) {
                        transformedQuestion.options = data.options.map((opt) => {
                            const solutionOpt = solution.options?.find((s) => s.id === opt.id);
                            return {
                                ...opt,
                                matchPairIds: solutionOpt?.matchPairIds,
                            };
                        });
                    }
                }

                logger.info({ questionId: input.questionId }, "Question retrieved for quiz");

                return transformedQuestion;
            } catch (error) {
                logger.error({ error, questionId: input.questionId }, "Error retrieving question");
                throw error;
            }
        }),

    updateForQuiz: managerOrFacultyProcedure
        .input(
            z
                .object({
                    questionId: z.string().uuid(),
                    quizId: z.string().uuid(),
                    courseId: z.string().uuid(),
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
                            z.object({
                                type: z.literal("TRUE_FALSE"),
                                trueFalseAnswer: z.boolean().optional(),
                                explanation: z.string().optional(),
                            }),
                            z.object({
                                type: z.literal("FILL_THE_BLANK"),
                                blankConfig: fillTheBlankConfigSchema.optional(),
                                explanation: z.string().optional(),
                            }),
                            z.object({
                                type: z.literal("DESCRIPTIVE"),
                                descriptiveConfig: descriptiveConfigSchema.optional(),
                                explanation: z.string().optional(),
                            }),
                            z.object({
                                type: z.literal("MATCHING"),
                                options: z.array(matchOptionsSchema).optional(),
                                explanation: z.string().optional(),
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

                const [quizCourse] = await db
                    .select({ courseId: courseQuizzesTable.courseId })
                    .from(courseQuizzesTable)
                    .where(eq(courseQuizzesTable.quizId, input.quizId))
                    .limit(1);

                if (!quizCourse) {
                    throw new Error("Quiz not found");
                }

                const [accessRecord] = await db
                    .select()
                    .from(courseInstructorsTable)
                    .where(
                        and(
                            eq(courseInstructorsTable.courseId, input.courseId),
                            eq(courseInstructorsTable.instructorId, userId)
                        )
                    )
                    .limit(1);

                if (!accessRecord && existing.createdById !== userId) {
                    throw new Error("You do not have permission to edit this question");
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

                if (input.type === "MCQ" || input.type === "MMCQ") {
                    if (input.questionData) {
                        updateData.questionData =
                            input.type === "MCQ"
                                ? versionMCQData(input.questionData)
                                : versionMMCQData(input.questionData);
                    }
                    if (input.solution) {
                        updateData.solution =
                            input.type === "MCQ"
                                ? versionMCQSolution(input.solution)
                                : versionMMCQSolution(input.solution);
                    }
                } else if (input.type === "TRUE_FALSE" && input.trueFalseAnswer !== undefined) {
                    updateData.questionData = {
                        version: QUESTION_VERSIONS[QuestionType.TRUE_FALSE].DATA,
                        data: {},
                    };
                    updateData.solution = versionTrueFalseSolution({
                        trueFalseAnswer: input.trueFalseAnswer,
                    });
                } else if (input.type === "FILL_THE_BLANK" && input.blankConfig) {
                    const { acceptableAnswers, ...dataWithoutAnswers } = input.blankConfig;
                    updateData.questionData = versionFillTheBlankData({
                        config: dataWithoutAnswers as never,
                    });
                    updateData.solution = versionFillTheBlankSolution({
                        acceptableAnswers: acceptableAnswers as never,
                    });
                } else if (input.type === "DESCRIPTIVE" && input.descriptiveConfig) {
                    const { modelAnswer, keywords, ...dataWithoutSolution } =
                        input.descriptiveConfig;
                    updateData.questionData = versionDescriptiveData({
                        config: dataWithoutSolution as never,
                    });
                    updateData.solution = versionDescriptiveSolution({
                        modelAnswer,
                        keywords,
                    });
                } else if (input.type === "MATCHING" && input.options) {
                    const dataOptions = input.options.map(({ matchPairIds: _, ...opt }) => opt);
                    updateData.questionData = versionMatchingData({
                        options: dataOptions as never,
                    });

                    const solutionOptions = input.options.map((opt) => ({
                        id: opt.id,
                        matchPairIds: opt.matchPairIds || [],
                    }));
                    updateData.solution = versionMatchingSolution({
                        options: solutionOptions as never,
                    });
                }

                const [question] = await db
                    .update(questionsTable)
                    .set(updateData)
                    .where(eq(questionsTable.id, input.questionId))
                    .returning();

                if (input.topicIds !== undefined) {
                    await db
                        .delete(topicQuestionsTable)
                        .where(eq(topicQuestionsTable.questionId, input.questionId));

                    if (input.topicIds && input.topicIds.length > 0) {
                        await db.insert(topicQuestionsTable).values(
                            input.topicIds.map((topicId) => ({
                                questionId: input.questionId,
                                topicId,
                            }))
                        );
                    }
                }

                logger.info({ questionId: input.questionId, userId }, "Question updated for quiz");

                return question;
            } catch (error) {
                logger.error({ error, questionId: input.questionId }, "Error updating question");
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error("Failed to update question. Please try again.");
            }
        }),

    deleteFromQuiz: managerOrFacultyProcedure
        .input(
            z.object({
                questionId: z.string().uuid(),
                quizId: z.string().uuid(),
                courseId: z.string().uuid(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                // Verify access
                const [accessRecord] = await db
                    .select()
                    .from(courseInstructorsTable)
                    .where(
                        and(
                            eq(courseInstructorsTable.courseId, input.courseId),
                            eq(courseInstructorsTable.instructorId, userId)
                        )
                    )
                    .limit(1);

                if (!accessRecord) {
                    throw new Error("You do not have permission to modify this quiz");
                }

                // Delete from quiz_questions table (not from questions table)
                await db
                    .delete(quizQuestionsTable)
                    .where(
                        and(
                            eq(quizQuestionsTable.questionId, input.questionId),
                            eq(quizQuestionsTable.quizId, input.quizId)
                        )
                    );

                logger.info(
                    { questionId: input.questionId, quizId: input.quizId, userId },
                    "Question removed from quiz"
                );

                return { success: true, id: input.questionId };
            } catch (error) {
                logger.error(
                    { error, questionId: input.questionId, quizId: input.quizId },
                    "Error removing question from quiz"
                );
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error("Failed to remove question from quiz. Please try again.");
            }
        }),

    addQuestionsFromBank: managerOrFacultyProcedure
        .input(
            z.object({
                quizId: z.string().uuid(),
                courseId: z.string().uuid(),
                sectionId: z.string().uuid().nullable(),
                bankQuestionIds: z.array(z.string().uuid()).min(1),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                // Verify access
                const [accessRecord] = await db
                    .select()
                    .from(courseInstructorsTable)
                    .where(
                        and(
                            eq(courseInstructorsTable.courseId, input.courseId),
                            eq(courseInstructorsTable.instructorId, userId)
                        )
                    )
                    .limit(1);

                if (!accessRecord) {
                    throw new Error("You do not have permission to modify this quiz");
                }

                // Get the bank question details to extract the actual question IDs
                const bankQuestions = await db
                    .select({
                        id: bankQuestionsTable.id,
                        questionId: bankQuestionsTable.questionId,
                    })
                    .from(bankQuestionsTable)
                    .where(inArray(bankQuestionsTable.id, input.bankQuestionIds));

                if (bankQuestions.length === 0) {
                    throw new Error("No valid questions found");
                }

                // Check for existing questions in quiz (using bankQuestionId to prevent duplicates)
                const existingQuizQuestions = await db
                    .select({
                        bankQuestionId: quizQuestionsTable.bankQuestionId,
                    })
                    .from(quizQuestionsTable)
                    .where(
                        and(
                            eq(quizQuestionsTable.quizId, input.quizId),
                            inArray(quizQuestionsTable.bankQuestionId, input.bankQuestionIds)
                        )
                    );

                const existingBankQuestionIds = new Set(
                    existingQuizQuestions
                        .map((q) => q.bankQuestionId)
                        .filter((id): id is string => id !== null)
                );

                // Filter out questions that already exist
                const questionsToAdd = bankQuestions.filter(
                    (bq) => !existingBankQuestionIds.has(bq.id)
                );

                if (questionsToAdd.length === 0) {
                    throw new Error("All selected questions are already in the quiz");
                }

                // Get the current max order index for the section/quiz
                const maxOrderResult = await db
                    .select({
                        maxOrder: sql<number>`COALESCE(MAX(${quizQuestionsTable.orderIndex}), -1)`,
                    })
                    .from(quizQuestionsTable)
                    .where(
                        and(
                            eq(quizQuestionsTable.quizId, input.quizId),
                            input.sectionId
                                ? eq(quizQuestionsTable.sectionId, input.sectionId)
                                : isNull(quizQuestionsTable.sectionId)
                        )
                    );

                let currentOrder = Number(maxOrderResult[0]?.maxOrder ?? -1) + 1;

                // Insert questions into quiz
                const quizQuestions = questionsToAdd.map((bq) => ({
                    quizId: input.quizId,
                    questionId: bq.questionId,
                    sectionId: input.sectionId,
                    bankQuestionId: bq.id,
                    orderIndex: currentOrder++,
                }));

                await db.insert(quizQuestionsTable).values(quizQuestions);

                logger.info(
                    {
                        quizId: input.quizId,
                        userId,
                        questionCount: questionsToAdd.length,
                        skipped: bankQuestions.length - questionsToAdd.length,
                    },
                    "Questions added from bank to quiz"
                );

                return {
                    success: true,
                    added: questionsToAdd.length,
                    skipped: bankQuestions.length - questionsToAdd.length,
                };
            } catch (error) {
                logger.error(
                    { error, quizId: input.quizId },
                    "Error adding questions from bank to quiz"
                );
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error("Failed to add questions to quiz. Please try again.");
            }
        }),
});
