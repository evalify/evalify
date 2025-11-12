import { z } from "zod";
import { createTRPCRouter, createCustomProcedure } from "@/server/trpc/trpc";
import { UserType } from "@/lib/auth/utils";
import { db } from "@/db";
import {
    quizSectionsTable,
    courseInstructorsTable,
    quizQuestionsTable,
    questionsTable,
    topicQuestionsTable,
    topicsTable,
} from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { unwrapVersion } from "@/lib/versioning/question-versioning";
import type {
    QuizQuestion,
    QuizMCQQuestion,
    QuizMMCQQuestion,
    QuizTrueFalseQuestion,
    QuizFillInBlanksQuestion,
    QuizDescriptiveQuestion,
    QuizMatchTheFollowingQuestion,
    MCQData,
    MCQSolution,
    MMCQData,
    MMCQSolution,
    FillInBlanksConfig,
    DescriptiveConfig,
    MatchOptions,
} from "@/types/questions";
import { QuestionType, Difficulty, CourseOutcome, BloomsLevel } from "@/types/questions";

const managerOrFacultyProcedure = createCustomProcedure([UserType.MANAGER, UserType.STAFF]);

type TopicLink = {
    topicId: string;
    topicName: string;
};

export const sectionRouter = createTRPCRouter({
    listByQuiz: managerOrFacultyProcedure
        .input(
            z.object({
                quizId: z.uuid(),
                courseId: z.uuid(),
            })
        )
        .query(async ({ input, ctx }) => {
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
                    throw new Error("You do not have permission to view this quiz");
                }

                const sections = await db
                    .select()
                    .from(quizSectionsTable)
                    .where(eq(quizSectionsTable.quizId, input.quizId))
                    .orderBy(quizSectionsTable.orderIndex);

                logger.info({ quizId: input.quizId, count: sections.length }, "Sections listed");

                return sections;
            } catch (error) {
                logger.error({ error, quizId: input.quizId }, "Error listing sections");
                throw error;
            }
        }),

    create: managerOrFacultyProcedure
        .input(
            z.object({
                quizId: z.string().uuid(),
                courseId: z.string().uuid(),
                name: z.string().min(1, "Section name is required"),
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

                // Get the current max order index
                const sections = await db
                    .select()
                    .from(quizSectionsTable)
                    .where(eq(quizSectionsTable.quizId, input.quizId));

                const maxOrderIndex =
                    sections.length > 0 ? Math.max(...sections.map((s) => s.orderIndex)) : -1;

                // Create section
                const [section] = await db
                    .insert(quizSectionsTable)
                    .values({
                        quizId: input.quizId,
                        name: input.name,
                        orderIndex: maxOrderIndex + 1,
                    })
                    .returning();

                logger.info({ sectionId: section.id, quizId: input.quizId }, "Section created");

                return section;
            } catch (error) {
                logger.error({ error, quizId: input.quizId }, "Error creating section");
                throw error;
            }
        }),

    updateName: managerOrFacultyProcedure
        .input(
            z.object({
                sectionId: z.string().uuid(),
                courseId: z.string().uuid(),
                name: z.string().min(1, "Section name is required"),
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

                await db
                    .update(quizSectionsTable)
                    .set({ name: input.name })
                    .where(eq(quizSectionsTable.id, input.sectionId));

                logger.info({ sectionId: input.sectionId }, "Section name updated");

                return { success: true };
            } catch (error) {
                logger.error({ error, sectionId: input.sectionId }, "Error updating section name");
                throw error;
            }
        }),

    delete: managerOrFacultyProcedure
        .input(
            z.object({
                sectionId: z.string().uuid(),
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

                // Set questions in this section to null sectionId
                await db
                    .update(quizQuestionsTable)
                    .set({ sectionId: null })
                    .where(eq(quizQuestionsTable.sectionId, input.sectionId));

                // Delete section
                await db.delete(quizSectionsTable).where(eq(quizSectionsTable.id, input.sectionId));

                logger.info({ sectionId: input.sectionId }, "Section deleted");

                return { success: true };
            } catch (error) {
                logger.error({ error, sectionId: input.sectionId }, "Error deleting section");
                throw error;
            }
        }),

    listQuestionsInSection: managerOrFacultyProcedure
        .input(
            z.object({
                sectionId: z.string().uuid().optional().nullable(),
                quizId: z.string().uuid(),
                courseId: z.string().uuid(),
            })
        )
        .query(async ({ input, ctx }) => {
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
                    throw new Error("You do not have permission to view this quiz");
                }

                const condition = input.sectionId
                    ? and(
                          eq(quizQuestionsTable.quizId, input.quizId),
                          eq(quizQuestionsTable.sectionId, input.sectionId)
                      )
                    : and(
                          eq(quizQuestionsTable.quizId, input.quizId),
                          isNull(quizQuestionsTable.sectionId)
                      );

                const quizQuestions = await db
                    .select()
                    .from(quizQuestionsTable)
                    .where(condition)
                    .orderBy(quizQuestionsTable.orderIndex);

                // Fetch full question details for each quiz question
                const questionsWithDetails = await Promise.all(
                    quizQuestions.map(async (qq) => {
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
                            .where(eq(questionsTable.id, qq.questionId))
                            .limit(1);

                        if (!question) return null;

                        // Fetch topics for this question
                        const topicLinks: TopicLink[] = await db
                            .select({
                                topicId: topicQuestionsTable.topicId,
                                topicName: topicsTable.name,
                            })
                            .from(topicQuestionsTable)
                            .innerJoin(topicsTable, eq(topicQuestionsTable.topicId, topicsTable.id))
                            .where(eq(topicQuestionsTable.questionId, question.id));

                        // Unwrap versioned data
                        let unwrappedQuestionData = question.questionData;
                        let unwrappedSolution = question.solution;

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

                        // Transform data based on question type
                        let transformedQuestion: QuizQuestion;

                        if (question.type === "MCQ") {
                            transformedQuestion = {
                                type: QuestionType.MCQ,
                                id: question.id,
                                question: question.question,
                                marks: question.marks ?? 0,
                                negativeMarks: question.negativeMarks ?? 0,
                                difficulty: question.difficulty
                                    ? (question.difficulty as Difficulty)
                                    : undefined,
                                courseOutcome: question.courseOutcome
                                    ? (question.courseOutcome as CourseOutcome)
                                    : undefined,
                                bloomsLevel: question.bloomTaxonomyLevel
                                    ? (question.bloomTaxonomyLevel as BloomsLevel)
                                    : undefined,
                                questionData: unwrappedQuestionData as MCQData,
                                solution: unwrappedSolution as MCQSolution,
                                topics: topicLinks,
                                quizQuestionId: qq.id,
                                orderIndex: qq.orderIndex,
                                bankQuestionId: qq.bankQuestionId,
                            } satisfies QuizMCQQuestion;
                        } else if (question.type === "MMCQ") {
                            transformedQuestion = {
                                type: QuestionType.MMCQ,
                                id: question.id,
                                question: question.question,
                                marks: question.marks ?? 0,
                                negativeMarks: question.negativeMarks ?? 0,
                                difficulty: question.difficulty
                                    ? (question.difficulty as Difficulty)
                                    : undefined,
                                courseOutcome: question.courseOutcome
                                    ? (question.courseOutcome as CourseOutcome)
                                    : undefined,
                                bloomsLevel: question.bloomTaxonomyLevel
                                    ? (question.bloomTaxonomyLevel as BloomsLevel)
                                    : undefined,
                                questionData: unwrappedQuestionData as MMCQData,
                                solution: unwrappedSolution as MMCQSolution,
                                topics: topicLinks,
                                quizQuestionId: qq.id,
                                orderIndex: qq.orderIndex,
                                bankQuestionId: qq.bankQuestionId,
                            } satisfies QuizMMCQQuestion;
                        } else if (question.type === "TRUE_FALSE") {
                            const solutionData = unwrappedSolution as {
                                trueFalseAnswer?: boolean;
                                explanation?: string;
                            };
                            transformedQuestion = {
                                type: QuestionType.TRUE_FALSE,
                                id: question.id,
                                question: question.question,
                                marks: question.marks ?? 0,
                                negativeMarks: question.negativeMarks ?? 0,
                                difficulty: question.difficulty
                                    ? (question.difficulty as Difficulty)
                                    : undefined,
                                courseOutcome: question.courseOutcome
                                    ? (question.courseOutcome as CourseOutcome)
                                    : undefined,
                                bloomsLevel: question.bloomTaxonomyLevel
                                    ? (question.bloomTaxonomyLevel as BloomsLevel)
                                    : undefined,
                                trueFalseAnswer: solutionData?.trueFalseAnswer,
                                explanation: solutionData?.explanation,
                                topics: topicLinks,
                                quizQuestionId: qq.id,
                                orderIndex: qq.orderIndex,
                                bankQuestionId: qq.bankQuestionId,
                            } satisfies QuizTrueFalseQuestion;
                        } else if (question.type === "FILL_THE_BLANK") {
                            const data = unwrappedQuestionData as {
                                config?: Omit<FillInBlanksConfig, "acceptableAnswers">;
                            };
                            const solution = unwrappedSolution as {
                                acceptableAnswers?: FillInBlanksConfig["acceptableAnswers"];
                            };
                            transformedQuestion = {
                                type: QuestionType.FILL_THE_BLANK,
                                id: question.id,
                                question: question.question,
                                marks: question.marks ?? 0,
                                negativeMarks: question.negativeMarks ?? 0,
                                difficulty: question.difficulty
                                    ? (question.difficulty as Difficulty)
                                    : undefined,
                                courseOutcome: question.courseOutcome
                                    ? (question.courseOutcome as CourseOutcome)
                                    : undefined,
                                bloomsLevel: question.bloomTaxonomyLevel
                                    ? (question.bloomTaxonomyLevel as BloomsLevel)
                                    : undefined,
                                blankConfig: {
                                    ...data.config,
                                    acceptableAnswers: solution.acceptableAnswers,
                                } as FillInBlanksConfig,
                                topics: topicLinks,
                                quizQuestionId: qq.id,
                                orderIndex: qq.orderIndex,
                                bankQuestionId: qq.bankQuestionId,
                            } satisfies QuizFillInBlanksQuestion;
                        } else if (question.type === "DESCRIPTIVE") {
                            const data = unwrappedQuestionData as {
                                config?: Omit<DescriptiveConfig, "modelAnswer" | "keywords">;
                            };
                            const solution = unwrappedSolution as {
                                modelAnswer?: string;
                                keywords?: string[];
                            };
                            transformedQuestion = {
                                type: QuestionType.DESCRIPTIVE,
                                id: question.id,
                                question: question.question,
                                marks: question.marks ?? 0,
                                negativeMarks: question.negativeMarks ?? 0,
                                difficulty: question.difficulty
                                    ? (question.difficulty as Difficulty)
                                    : undefined,
                                courseOutcome: question.courseOutcome
                                    ? (question.courseOutcome as CourseOutcome)
                                    : undefined,
                                bloomsLevel: question.bloomTaxonomyLevel
                                    ? (question.bloomTaxonomyLevel as BloomsLevel)
                                    : undefined,
                                descriptiveConfig: {
                                    ...data.config,
                                    modelAnswer: solution.modelAnswer,
                                    keywords: solution.keywords,
                                } as DescriptiveConfig,
                                topics: topicLinks,
                                quizQuestionId: qq.id,
                                orderIndex: qq.orderIndex,
                                bankQuestionId: qq.bankQuestionId,
                            } satisfies QuizDescriptiveQuestion;
                        } else if (question.type === "MATCHING") {
                            const data = unwrappedQuestionData as {
                                options?: Omit<MatchOptions, "matchPairIds">[];
                            };
                            const solution = unwrappedSolution as {
                                options?: Array<{ id: string; matchPairIds?: string[] }>;
                            };

                            const options: MatchOptions[] =
                                data.options?.map((opt) => {
                                    const solutionOpt = solution.options?.find(
                                        (s) => s.id === opt.id
                                    );
                                    return {
                                        ...opt,
                                        matchPairIds: solutionOpt?.matchPairIds,
                                    } as MatchOptions;
                                }) ?? [];

                            transformedQuestion = {
                                type: QuestionType.MATCHING,
                                id: question.id,
                                question: question.question,
                                marks: question.marks ?? 0,
                                negativeMarks: question.negativeMarks ?? 0,
                                difficulty: question.difficulty
                                    ? (question.difficulty as Difficulty)
                                    : undefined,
                                courseOutcome: question.courseOutcome
                                    ? (question.courseOutcome as CourseOutcome)
                                    : undefined,
                                bloomsLevel: question.bloomTaxonomyLevel
                                    ? (question.bloomTaxonomyLevel as BloomsLevel)
                                    : undefined,
                                options,
                                topics: topicLinks,
                                quizQuestionId: qq.id,
                                orderIndex: qq.orderIndex,
                                bankQuestionId: qq.bankQuestionId,
                            } satisfies QuizMatchTheFollowingQuestion;
                        } else {
                            // For unsupported question types, return null
                            return null;
                        }

                        return transformedQuestion;
                    })
                );

                // Filter out any null results
                const validQuestions = questionsWithDetails.filter((q) => q !== null);

                return validQuestions;
            } catch (error) {
                logger.error(
                    { error, sectionId: input.sectionId },
                    "Error listing questions in section"
                );
                throw error;
            }
        }),

    // Get all bankQuestionIds from a quiz (across all sections)
    getAllQuizBankQuestionIds: managerOrFacultyProcedure
        .input(
            z.object({
                quizId: z.string().uuid(),
                courseId: z.string().uuid(),
            })
        )
        .query(async ({ input, ctx }) => {
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
                    throw new Error("You do not have permission to view this quiz");
                }

                // Get all bankQuestionIds from the quiz
                const quizQuestions = await db
                    .select({
                        bankQuestionId: quizQuestionsTable.bankQuestionId,
                    })
                    .from(quizQuestionsTable)
                    .where(eq(quizQuestionsTable.quizId, input.quizId));

                // Filter out null bankQuestionIds and return unique values
                const bankQuestionIds = quizQuestions
                    .map((q) => q.bankQuestionId)
                    .filter((id): id is string => id !== null);

                logger.info(
                    {
                        quizId: input.quizId,
                        totalQuestions: quizQuestions.length,
                        bankQuestionIds: bankQuestionIds.length,
                        ids: bankQuestionIds,
                    },
                    "Retrieved bank question IDs from quiz"
                );

                return bankQuestionIds;
            } catch (error) {
                logger.error(
                    { error, quizId: input.quizId },
                    "Error getting quiz bank question IDs"
                );
                throw error;
            }
        }),

    reorderSections: managerOrFacultyProcedure
        .input(
            z.object({
                quizId: z.string().uuid(),
                courseId: z.string().uuid(),
                sectionOrders: z.array(
                    z.object({
                        sectionId: z.string().uuid(),
                        orderIndex: z.number(),
                    })
                ),
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

                // Update order for each section
                await Promise.all(
                    input.sectionOrders.map(({ sectionId, orderIndex }) =>
                        db
                            .update(quizSectionsTable)
                            .set({ orderIndex })
                            .where(eq(quizSectionsTable.id, sectionId))
                    )
                );

                logger.info({ quizId: input.quizId }, "Sections reordered");

                return { success: true };
            } catch (error) {
                logger.error({ error, quizId: input.quizId }, "Error reordering sections");
                throw error;
            }
        }),

    reorderQuestions: managerOrFacultyProcedure
        .input(
            z.object({
                quizId: z.string().uuid(),
                courseId: z.string().uuid(),
                sectionId: z.string().uuid().optional().nullable(),
                questionOrders: z.array(
                    z.object({
                        quizQuestionId: z.string().uuid(),
                        orderIndex: z.number(),
                    })
                ),
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

                // Update order for each question
                await Promise.all(
                    input.questionOrders.map(({ quizQuestionId, orderIndex }) =>
                        db
                            .update(quizQuestionsTable)
                            .set({ orderIndex })
                            .where(eq(quizQuestionsTable.id, quizQuestionId))
                    )
                );

                logger.info(
                    { quizId: input.quizId, sectionId: input.sectionId },
                    "Questions reordered"
                );

                return { success: true };
            } catch (error) {
                logger.error({ error, quizId: input.quizId }, "Error reordering questions");
                throw error;
            }
        }),

    moveQuestion: managerOrFacultyProcedure
        .input(
            z.object({
                quizId: z.uuid(),
                courseId: z.uuid(),
                quizQuestionId: z.uuid(),
                targetSectionId: z.uuid().optional().nullable(),
                targetOrderIndex: z.number(),
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

                // Update the question's section and order
                await db
                    .update(quizQuestionsTable)
                    .set({
                        sectionId: input.targetSectionId || null,
                        orderIndex: input.targetOrderIndex,
                    })
                    .where(eq(quizQuestionsTable.id, input.quizQuestionId));

                logger.info(
                    {
                        quizQuestionId: input.quizQuestionId,
                        targetSectionId: input.targetSectionId,
                    },
                    "Question moved to new section"
                );

                return { success: true };
            } catch (error) {
                logger.error({ error, quizId: input.quizId }, "Error moving question");
                throw error;
            }
        }),
});
