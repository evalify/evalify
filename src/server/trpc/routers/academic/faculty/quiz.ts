import { z } from "zod";
import { createTRPCRouter, facultyAndManagerProcedure } from "../../../trpc";
import { db } from "@/db";
import {
    quizzesTable,
    courseQuizzesTable,
    coursesTable,
    courseInstructorsTable,
    semesterManagersTable,
    quizTagsTable,
    quizQuizTagsTable,
    studentQuizzesTable,
    labQuizzesTable,
    quizBatchesTable,
    quizEvaluationSettingsTable,
    quizResponseTable,
    batchesTable,
    batchStudentsTable,
    usersTable,
    quizQuestionsTable,
    questionsTable,
    bankQuestionsTable,
    banksTable,
    topicQuestionsTable,
    topicsTable,
} from "@/db/schema";
import { eq, and, or, ilike, desc, count, sql, inArray, asc } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Faculty/Manager quiz router
 * Handles quiz listing and management for faculty and managers
 */
export const facultyQuizRouter = createTRPCRouter({
    /**
     * List quizzes for a specific course
     * - Faculty: courses where they are instructors
     * - Manager: courses in semesters they manage
     */
    listByCourse: facultyAndManagerProcedure
        .input(
            z.object({
                courseId: z.uuid(),
                searchTerm: z.string().optional(),
                status: z.enum(["ALL", "UPCOMING", "ACTIVE", "COMPLETED"]).default("ALL"),
                publishStatus: z.enum(["ALL", "PUBLISHED", "UNPUBLISHED"]).default("ALL"),
                limit: z.number().min(1).max(100).default(50),
                offset: z.number().min(0).default(0),
            })
        )
        .query(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                // Verify user has access to this course (as instructor or manager)
                const courseAccess = await db
                    .select({
                        courseId: coursesTable.id,
                        isInstructor: courseInstructorsTable.instructorId,
                        isManager: semesterManagersTable.managerId,
                    })
                    .from(coursesTable)
                    .leftJoin(
                        courseInstructorsTable,
                        and(
                            eq(courseInstructorsTable.courseId, coursesTable.id),
                            eq(courseInstructorsTable.instructorId, userId)
                        )
                    )
                    .leftJoin(
                        semesterManagersTable,
                        and(
                            eq(semesterManagersTable.semesterId, coursesTable.semesterId),
                            eq(semesterManagersTable.managerId, userId)
                        )
                    )
                    .where(eq(coursesTable.id, input.courseId))
                    .limit(1);

                if (
                    courseAccess.length === 0 ||
                    (!courseAccess[0].isInstructor && !courseAccess[0].isManager)
                ) {
                    throw new Error("Unauthorized: You don't have access to this course");
                }

                // Build WHERE conditions
                const conditions = [eq(courseQuizzesTable.courseId, input.courseId)];

                // Search filter
                if (input.searchTerm) {
                    const searchCondition = or(
                        ilike(quizzesTable.name, `%${input.searchTerm}%`),
                        ilike(quizzesTable.description, `%${input.searchTerm}%`)
                    );
                    if (searchCondition) {
                        conditions.push(searchCondition);
                    }
                }

                // Status filter (based on time)
                const now = new Date();
                if (input.status === "UPCOMING") {
                    conditions.push(sql`${quizzesTable.startTime} > ${now}`);
                } else if (input.status === "ACTIVE") {
                    conditions.push(
                        sql`${quizzesTable.startTime} <= ${now} AND ${quizzesTable.endTime} >= ${now}`
                    );
                } else if (input.status === "COMPLETED") {
                    conditions.push(sql`${quizzesTable.endTime} < ${now}`);
                }

                // Publish status filter
                if (input.publishStatus === "PUBLISHED") {
                    conditions.push(eq(quizzesTable.publishQuiz, true));
                } else if (input.publishStatus === "UNPUBLISHED") {
                    conditions.push(eq(quizzesTable.publishQuiz, false));
                }

                // Get quizzes with question count
                const quizzes = await db
                    .select({
                        id: quizzesTable.id,
                        name: quizzesTable.name,
                        description: quizzesTable.description,
                        instructions: quizzesTable.instructions,
                        startTime: quizzesTable.startTime,
                        endTime: quizzesTable.endTime,
                        duration: quizzesTable.duration,
                        password: quizzesTable.password,
                        fullScreen: quizzesTable.fullScreen,
                        shuffleQuestions: quizzesTable.shuffleQuestions,
                        shuffleOptions: quizzesTable.shuffleOptions,
                        linearQuiz: quizzesTable.linearQuiz,
                        calculator: quizzesTable.calculator,
                        autoSubmit: quizzesTable.autoSubmit,
                        publishResult: quizzesTable.publishResult,
                        publishQuiz: quizzesTable.publishQuiz,
                        kioskMode: quizzesTable.kioskMode,
                        createdAt: quizzesTable.created_at,
                        updatedAt: quizzesTable.updated_at,
                        createdById: quizzesTable.createdById,
                    })
                    .from(quizzesTable)
                    .innerJoin(courseQuizzesTable, eq(courseQuizzesTable.quizId, quizzesTable.id))
                    .where(and(...conditions))
                    .orderBy(desc(quizzesTable.startTime))
                    .limit(input.limit)
                    .offset(input.offset);

                // Get question counts for each quiz
                const quizIds = quizzes.map((q) => q.id);
                const questionCounts =
                    quizIds.length > 0
                        ? await db
                              .select({
                                  quizId: sql<string>`quiz_id`,
                                  count: count(),
                              })
                              .from(sql`quiz_questions`)
                              .where(sql`quiz_id IN ${quizIds}`)
                              .groupBy(sql`quiz_id`)
                        : [];

                const questionCountMap = new Map(
                    questionCounts.map((qc) => [qc.quizId, Number(qc.count)])
                );

                // Get total count with same filters
                const totalResult = await db
                    .select({ count: count() })
                    .from(quizzesTable)
                    .innerJoin(courseQuizzesTable, eq(courseQuizzesTable.quizId, quizzesTable.id))
                    .where(and(...conditions));

                const quizzesWithCounts = quizzes.map((quiz) => ({
                    ...quiz,
                    questionCount: questionCountMap.get(quiz.id) || 0,
                    password: quiz.password ? "***" : null, // Mask password
                }));

                logger.info(
                    {
                        userId,
                        courseId: input.courseId,
                        count: quizzes.length,
                        total: totalResult[0].count,
                    },
                    "Course quizzes listed"
                );

                return {
                    quizzes: quizzesWithCounts,
                    total: Number(totalResult[0].count),
                };
            } catch (error) {
                logger.error(
                    { error, userId: ctx.session.user.id, courseId: input.courseId },
                    "Error listing course quizzes"
                );
                throw error;
            }
        }),

    /**
     * Get course details for quiz page header
     */
    getCourseInfo: facultyAndManagerProcedure
        .input(
            z.object({
                courseId: z.uuid(),
            })
        )
        .query(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                // Get course with access verification
                const courseData = await db
                    .select({
                        id: coursesTable.id,
                        name: coursesTable.name,
                        code: coursesTable.code,
                        description: coursesTable.description,
                        image: coursesTable.image,
                        type: coursesTable.type,
                        isInstructor: courseInstructorsTable.instructorId,
                        isManager: semesterManagersTable.managerId,
                    })
                    .from(coursesTable)
                    .leftJoin(
                        courseInstructorsTable,
                        and(
                            eq(courseInstructorsTable.courseId, coursesTable.id),
                            eq(courseInstructorsTable.instructorId, userId)
                        )
                    )
                    .leftJoin(
                        semesterManagersTable,
                        and(
                            eq(semesterManagersTable.semesterId, coursesTable.semesterId),
                            eq(semesterManagersTable.managerId, userId)
                        )
                    )
                    .where(eq(coursesTable.id, input.courseId))
                    .limit(1);

                if (
                    courseData.length === 0 ||
                    (!courseData[0].isInstructor && !courseData[0].isManager)
                ) {
                    throw new Error("Course not found or unauthorized");
                }

                return {
                    id: courseData[0].id,
                    name: courseData[0].name,
                    code: courseData[0].code,
                    description: courseData[0].description,
                    image: courseData[0].image,
                    type: courseData[0].type,
                };
            } catch (error) {
                logger.error(
                    { error, userId: ctx.session.user.id, courseId: input.courseId },
                    "Error getting course info"
                );
                throw error;
            }
        }),

    /**
     * Get quiz by ID for editing
     */
    getById: facultyAndManagerProcedure
        .input(
            z.object({
                quizId: z.uuid(),
            })
        )
        .query(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                // Get quiz with access verification
                const quizData = await db
                    .select({
                        quiz: quizzesTable,
                        isInstructor: courseInstructorsTable.instructorId,
                        isManager: semesterManagersTable.managerId,
                    })
                    .from(quizzesTable)
                    .innerJoin(courseQuizzesTable, eq(courseQuizzesTable.quizId, quizzesTable.id))
                    .innerJoin(coursesTable, eq(coursesTable.id, courseQuizzesTable.courseId))
                    .leftJoin(
                        courseInstructorsTable,
                        and(
                            eq(courseInstructorsTable.courseId, coursesTable.id),
                            eq(courseInstructorsTable.instructorId, userId)
                        )
                    )
                    .leftJoin(
                        semesterManagersTable,
                        and(
                            eq(semesterManagersTable.semesterId, coursesTable.semesterId),
                            eq(semesterManagersTable.managerId, userId)
                        )
                    )
                    .where(eq(quizzesTable.id, input.quizId))
                    .limit(1);

                if (
                    quizData.length === 0 ||
                    (!quizData[0].isInstructor && !quizData[0].isManager)
                ) {
                    throw new Error("Quiz not found or unauthorized");
                }

                // Get evaluation settings
                const evaluationSettings = await db
                    .select()
                    .from(quizEvaluationSettingsTable)
                    .where(eq(quizEvaluationSettingsTable.id, input.quizId))
                    .limit(1);

                // Get associated tags
                const tags = await db
                    .select({ name: quizTagsTable.name })
                    .from(quizQuizTagsTable)
                    .innerJoin(quizTagsTable, eq(quizTagsTable.id, quizQuizTagsTable.quizTagId))
                    .where(eq(quizQuizTagsTable.quizId, input.quizId));

                // Get associated courses
                const courses = await db
                    .select({ courseId: courseQuizzesTable.courseId })
                    .from(courseQuizzesTable)
                    .where(eq(courseQuizzesTable.quizId, input.quizId));

                // Get associated students
                const students = await db
                    .select({ studentId: studentQuizzesTable.studentId })
                    .from(studentQuizzesTable)
                    .where(eq(studentQuizzesTable.quizId, input.quizId));

                // Get associated labs
                const labs = await db
                    .select({ labId: labQuizzesTable.labId })
                    .from(labQuizzesTable)
                    .where(eq(labQuizzesTable.quizId, input.quizId));

                // Get associated batches
                const batches = await db
                    .select({ batchId: quizBatchesTable.batchId })
                    .from(quizBatchesTable)
                    .where(eq(quizBatchesTable.quizId, input.quizId));

                return {
                    ...quizData[0].quiz,
                    tags: tags.map((t) => t.name),
                    courseIds: courses.map((c) => c.courseId),
                    studentIds: students.map((s) => s.studentId),
                    labIds: labs.map((l) => l.labId),
                    batchIds: batches.map((b) => b.batchId),
                    scoring: evaluationSettings[0]
                        ? {
                              mcqGlobalPartialMarking:
                                  evaluationSettings[0].mcqGlobalPartialMarking,
                              mcqGlobalNegativeMark: evaluationSettings[0].mcqGlobalNegativeMark,
                              mcqGlobalNegativePercent:
                                  evaluationSettings[0].mcqGlobalNegativePercent,
                              codingGlobalPartialMarking:
                                  evaluationSettings[0].codingGlobalPartialMarking,
                              llmEvaluationEnabled: evaluationSettings[0].llmEvaluationEnabled,
                              llmProvider: evaluationSettings[0].llmProvider,
                              llmModelName: evaluationSettings[0].llmModelName,
                              fitbLlmSystemPrompt: evaluationSettings[0].fitbLlmSystemPrompt,
                              descLlmSystemPrompt: evaluationSettings[0].descLlmSystemPrompt,
                          }
                        : undefined,
                };
            } catch (error) {
                logger.error(
                    { error, userId: ctx.session.user.id, quizId: input.quizId },
                    "Error getting quiz by ID"
                );
                throw error;
            }
        }),

    /**
     * Create a new quiz
     */
    create: facultyAndManagerProcedure
        .input(
            z.object({
                courseId: z.uuid(),
                name: z.string().min(1, "Quiz name is required"),
                description: z.string().optional(),
                instructions: z.string().optional(),
                startTime: z.date(),
                endTime: z.date(),
                durationInMinutes: z.number().positive(),
                password: z.string().optional(),
                fullScreen: z.boolean().default(false),
                shuffleQuestions: z.boolean().default(false),
                shuffleOptions: z.boolean().default(false),
                linearQuiz: z.boolean().default(false),
                calculator: z.boolean().default(false),
                autoSubmit: z.boolean().default(false),
                publishResult: z.boolean().default(false),
                publishQuiz: z.boolean().default(false),
                quizTags: z.array(z.string()).optional(),
                courseIds: z.array(z.uuid()).optional(),
                studentIds: z.array(z.uuid()).optional(),
                labIds: z.array(z.uuid()).optional(),
                batchIds: z.array(z.uuid()).optional(),
                scoring: z
                    .object({
                        mcqGlobalPartialMarking: z.boolean().default(false),
                        mcqGlobalNegativeMark: z.number().optional().nullable(),
                        mcqGlobalNegativePercent: z.number().optional().nullable(),
                        codingGlobalPartialMarking: z.boolean().default(false),
                        llmEvaluationEnabled: z.boolean().default(false),
                        llmProvider: z.string().optional(),
                        llmModelName: z.string().optional(),
                        fitbLlmSystemPrompt: z.string().optional(),
                        descLlmSystemPrompt: z.string().optional(),
                    })
                    .optional()
                    .refine(
                        (data) => {
                            if (!data) return true;
                            const hasFixed =
                                data.mcqGlobalNegativeMark !== undefined &&
                                data.mcqGlobalNegativeMark !== null;
                            const hasPercent =
                                data.mcqGlobalNegativePercent !== undefined &&
                                data.mcqGlobalNegativePercent !== null;
                            return !(hasFixed && hasPercent);
                        },
                        {
                            message:
                                "Cannot have both fixed negative mark and percentage negative mark",
                            path: ["mcqGlobalNegativeMark"],
                        }
                    ),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                // Verify user has access to the course
                const courseAccess = await db
                    .select({
                        courseId: coursesTable.id,
                        isInstructor: courseInstructorsTable.instructorId,
                        isManager: semesterManagersTable.managerId,
                    })
                    .from(coursesTable)
                    .leftJoin(
                        courseInstructorsTable,
                        and(
                            eq(courseInstructorsTable.courseId, coursesTable.id),
                            eq(courseInstructorsTable.instructorId, userId)
                        )
                    )
                    .leftJoin(
                        semesterManagersTable,
                        and(
                            eq(semesterManagersTable.semesterId, coursesTable.semesterId),
                            eq(semesterManagersTable.managerId, userId)
                        )
                    )
                    .where(eq(coursesTable.id, input.courseId))
                    .limit(1);

                if (
                    courseAccess.length === 0 ||
                    (!courseAccess[0].isInstructor && !courseAccess[0].isManager)
                ) {
                    throw new Error("Unauthorized: You don't have access to this course");
                }

                // Convert duration to PostgreSQL interval format
                const durationInterval = `${input.durationInMinutes} minutes`;

                // Create quiz
                const [quiz] = await db
                    .insert(quizzesTable)
                    .values({
                        name: input.name,
                        description: input.description,
                        instructions: input.instructions,
                        startTime: input.startTime,
                        endTime: input.endTime,
                        duration: durationInterval,
                        password: input.password,
                        fullScreen: input.fullScreen,
                        shuffleQuestions: input.shuffleQuestions,
                        shuffleOptions: input.shuffleOptions,
                        linearQuiz: input.linearQuiz,
                        calculator: input.calculator,
                        autoSubmit: input.autoSubmit,
                        publishResult: input.publishResult,
                        publishQuiz: input.publishQuiz,
                        createdById: userId,
                    })
                    .returning();

                if (!quiz) {
                    throw new Error("Failed to create quiz");
                }

                // Link quiz to courses (including the main course)
                const coursesToLink = new Set([input.courseId, ...(input.courseIds || [])]);
                if (coursesToLink.size > 0) {
                    await db.insert(courseQuizzesTable).values(
                        Array.from(coursesToLink).map((courseId) => ({
                            quizId: quiz.id,
                            courseId,
                        }))
                    );
                }

                // Link students
                if (input.studentIds && input.studentIds.length > 0) {
                    await db.insert(studentQuizzesTable).values(
                        input.studentIds.map((studentId) => ({
                            quizId: quiz.id,
                            studentId,
                        }))
                    );
                }

                // Link labs
                if (input.labIds && input.labIds.length > 0) {
                    await db.insert(labQuizzesTable).values(
                        input.labIds.map((labId) => ({
                            quizId: quiz.id,
                            labId,
                        }))
                    );
                }

                // Link batches
                if (input.batchIds && input.batchIds.length > 0) {
                    await db.insert(quizBatchesTable).values(
                        input.batchIds.map((batchId) => ({
                            quizId: quiz.id,
                            batchId,
                        }))
                    );
                }

                // Handle tags
                if (input.quizTags && input.quizTags.length > 0) {
                    for (const tagName of input.quizTags) {
                        // Get or create tag
                        let [tag] = await db
                            .select()
                            .from(quizTagsTable)
                            .where(eq(quizTagsTable.name, tagName))
                            .limit(1);

                        if (!tag) {
                            [tag] = await db
                                .insert(quizTagsTable)
                                .values({ name: tagName })
                                .returning();
                        }

                        // Link tag to quiz
                        await db.insert(quizQuizTagsTable).values({
                            quizId: quiz.id,
                            quizTagId: tag!.id,
                        });
                    }
                }

                // Create evaluation settings
                await db.insert(quizEvaluationSettingsTable).values({
                    id: quiz.id,
                    mcqGlobalPartialMarking: input.scoring?.mcqGlobalPartialMarking ?? false,
                    mcqGlobalNegativeMark: input.scoring?.mcqGlobalNegativeMark,
                    mcqGlobalNegativePercent: input.scoring?.mcqGlobalNegativePercent,
                    codingGlobalPartialMarking: input.scoring?.codingGlobalPartialMarking ?? false,
                    llmEvaluationEnabled: input.scoring?.llmEvaluationEnabled ?? false,
                    llmProvider: input.scoring?.llmProvider,
                    llmModelName: input.scoring?.llmModelName,
                    fitbLlmSystemPrompt: input.scoring?.fitbLlmSystemPrompt,
                    descLlmSystemPrompt: input.scoring?.descLlmSystemPrompt,
                });

                logger.info(
                    { userId, quizId: quiz.id, courseId: input.courseId },
                    "Quiz created successfully"
                );

                return { quizId: quiz.id };
            } catch (error) {
                logger.error({ error, userId: ctx.session.user.id }, "Error creating quiz");
                throw error;
            }
        }),

    /**
     * Update an existing quiz
     */
    update: facultyAndManagerProcedure
        .input(
            z.object({
                quizId: z.uuid(),
                name: z.string().min(1).optional(),
                description: z.string().optional(),
                instructions: z.string().optional(),
                startTime: z.date().optional(),
                endTime: z.date().optional(),
                durationInMinutes: z.number().positive().optional(),
                password: z.string().optional(),
                fullScreen: z.boolean().optional(),
                shuffleQuestions: z.boolean().optional(),
                shuffleOptions: z.boolean().optional(),
                linearQuiz: z.boolean().optional(),
                calculator: z.boolean().optional(),
                autoSubmit: z.boolean().optional(),
                publishResult: z.boolean().optional(),
                publishQuiz: z.boolean().optional(),
                quizTags: z.array(z.string()).optional(),
                courseIds: z.array(z.uuid()).optional(),
                studentIds: z.array(z.uuid()).optional(),
                labIds: z.array(z.uuid()).optional(),
                batchIds: z.array(z.uuid()).optional(),
                scoring: z
                    .object({
                        mcqGlobalPartialMarking: z.boolean().optional(),
                        mcqGlobalNegativeMark: z.number().optional().nullable(),
                        mcqGlobalNegativePercent: z.number().optional().nullable(),
                        codingGlobalPartialMarking: z.boolean().optional(),
                        llmEvaluationEnabled: z.boolean().optional(),
                        llmProvider: z.string().optional(),
                        llmModelName: z.string().optional(),
                        fitbLlmSystemPrompt: z.string().optional(),
                        descLlmSystemPrompt: z.string().optional(),
                    })
                    .optional()
                    .refine(
                        (data) => {
                            if (!data) return true;
                            const hasFixed =
                                data.mcqGlobalNegativeMark !== undefined &&
                                data.mcqGlobalNegativeMark !== null;
                            const hasPercent =
                                data.mcqGlobalNegativePercent !== undefined &&
                                data.mcqGlobalNegativePercent !== null;
                            return !(hasFixed && hasPercent);
                        },
                        {
                            message:
                                "Cannot have both fixed negative mark and percentage negative mark",
                            path: ["mcqGlobalNegativeMark"],
                        }
                    ),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                // Verify user has access to this quiz
                const quizAccess = await db
                    .select({
                        quizId: quizzesTable.id,
                        isInstructor: courseInstructorsTable.instructorId,
                        isManager: semesterManagersTable.managerId,
                    })
                    .from(quizzesTable)
                    .innerJoin(courseQuizzesTable, eq(courseQuizzesTable.quizId, quizzesTable.id))
                    .innerJoin(coursesTable, eq(coursesTable.id, courseQuizzesTable.courseId))
                    .leftJoin(
                        courseInstructorsTable,
                        and(
                            eq(courseInstructorsTable.courseId, coursesTable.id),
                            eq(courseInstructorsTable.instructorId, userId)
                        )
                    )
                    .leftJoin(
                        semesterManagersTable,
                        and(
                            eq(semesterManagersTable.semesterId, coursesTable.semesterId),
                            eq(semesterManagersTable.managerId, userId)
                        )
                    )
                    .where(eq(quizzesTable.id, input.quizId))
                    .limit(1);

                if (
                    quizAccess.length === 0 ||
                    (!quizAccess[0].isInstructor && !quizAccess[0].isManager)
                ) {
                    throw new Error("Quiz not found or unauthorized");
                }

                // Build update object
                const updateData: Record<string, unknown> = {};
                if (input.name !== undefined) updateData.name = input.name;
                if (input.description !== undefined) updateData.description = input.description;
                if (input.instructions !== undefined) updateData.instructions = input.instructions;
                if (input.startTime !== undefined) updateData.startTime = input.startTime;
                if (input.endTime !== undefined) updateData.endTime = input.endTime;
                if (input.durationInMinutes !== undefined)
                    updateData.duration = `${input.durationInMinutes} minutes`;
                if (input.password !== undefined) updateData.password = input.password;
                if (input.fullScreen !== undefined) updateData.fullScreen = input.fullScreen;
                if (input.shuffleQuestions !== undefined)
                    updateData.shuffleQuestions = input.shuffleQuestions;
                if (input.shuffleOptions !== undefined)
                    updateData.shuffleOptions = input.shuffleOptions;
                if (input.linearQuiz !== undefined) updateData.linearQuiz = input.linearQuiz;
                if (input.calculator !== undefined) updateData.calculator = input.calculator;
                if (input.autoSubmit !== undefined) updateData.autoSubmit = input.autoSubmit;
                if (input.publishResult !== undefined)
                    updateData.publishResult = input.publishResult;
                if (input.publishQuiz !== undefined) updateData.publishQuiz = input.publishQuiz;

                // Update quiz
                if (Object.keys(updateData).length > 0) {
                    await db
                        .update(quizzesTable)
                        .set(updateData)
                        .where(eq(quizzesTable.id, input.quizId));
                }

                // Update course associations
                if (input.courseIds !== undefined) {
                    await db
                        .delete(courseQuizzesTable)
                        .where(eq(courseQuizzesTable.quizId, input.quizId));
                    if (input.courseIds.length > 0) {
                        await db.insert(courseQuizzesTable).values(
                            input.courseIds.map((courseId) => ({
                                quizId: input.quizId,
                                courseId,
                            }))
                        );
                    }
                }

                // Update student associations
                if (input.studentIds !== undefined) {
                    await db
                        .delete(studentQuizzesTable)
                        .where(eq(studentQuizzesTable.quizId, input.quizId));
                    if (input.studentIds.length > 0) {
                        await db.insert(studentQuizzesTable).values(
                            input.studentIds.map((studentId) => ({
                                quizId: input.quizId,
                                studentId,
                            }))
                        );
                    }
                }

                // Update lab associations
                if (input.labIds !== undefined) {
                    await db
                        .delete(labQuizzesTable)
                        .where(eq(labQuizzesTable.quizId, input.quizId));
                    if (input.labIds.length > 0) {
                        await db.insert(labQuizzesTable).values(
                            input.labIds.map((labId) => ({
                                quizId: input.quizId,
                                labId,
                            }))
                        );
                    }
                }

                // Update batch associations
                if (input.batchIds !== undefined) {
                    await db
                        .delete(quizBatchesTable)
                        .where(eq(quizBatchesTable.quizId, input.quizId));
                    if (input.batchIds.length > 0) {
                        await db.insert(quizBatchesTable).values(
                            input.batchIds.map((batchId) => ({
                                quizId: input.quizId,
                                batchId,
                            }))
                        );
                    }
                }

                // Update tags
                if (input.quizTags !== undefined) {
                    // Delete existing tag associations
                    await db
                        .delete(quizQuizTagsTable)
                        .where(eq(quizQuizTagsTable.quizId, input.quizId));

                    // Add new tags
                    if (input.quizTags.length > 0) {
                        for (const tagName of input.quizTags) {
                            // Get or create tag
                            let [tag] = await db
                                .select()
                                .from(quizTagsTable)
                                .where(eq(quizTagsTable.name, tagName))
                                .limit(1);

                            if (!tag) {
                                [tag] = await db
                                    .insert(quizTagsTable)
                                    .values({ name: tagName })
                                    .returning();
                            }

                            // Link tag to quiz
                            await db.insert(quizQuizTagsTable).values({
                                quizId: input.quizId,
                                quizTagId: tag!.id,
                            });
                        }
                    }
                }

                // Update evaluation settings
                if (input.scoring) {
                    const scoringUpdate: Record<string, unknown> = {};
                    if (input.scoring.mcqGlobalPartialMarking !== undefined)
                        scoringUpdate.mcqGlobalPartialMarking =
                            input.scoring.mcqGlobalPartialMarking;
                    if (input.scoring.mcqGlobalNegativeMark !== undefined)
                        scoringUpdate.mcqGlobalNegativeMark = input.scoring.mcqGlobalNegativeMark;
                    if (input.scoring.mcqGlobalNegativePercent !== undefined)
                        scoringUpdate.mcqGlobalNegativePercent =
                            input.scoring.mcqGlobalNegativePercent;
                    if (input.scoring.codingGlobalPartialMarking !== undefined)
                        scoringUpdate.codingGlobalPartialMarking =
                            input.scoring.codingGlobalPartialMarking;
                    if (input.scoring.llmEvaluationEnabled !== undefined)
                        scoringUpdate.llmEvaluationEnabled = input.scoring.llmEvaluationEnabled;
                    if (input.scoring.llmProvider !== undefined)
                        scoringUpdate.llmProvider = input.scoring.llmProvider;
                    if (input.scoring.llmModelName !== undefined)
                        scoringUpdate.llmModelName = input.scoring.llmModelName;
                    if (input.scoring.fitbLlmSystemPrompt !== undefined)
                        scoringUpdate.fitbLlmSystemPrompt = input.scoring.fitbLlmSystemPrompt;
                    if (input.scoring.descLlmSystemPrompt !== undefined)
                        scoringUpdate.descLlmSystemPrompt = input.scoring.descLlmSystemPrompt;

                    if (Object.keys(scoringUpdate).length > 0) {
                        // Check if settings exist
                        const existingSettings = await db
                            .select()
                            .from(quizEvaluationSettingsTable)
                            .where(eq(quizEvaluationSettingsTable.id, input.quizId))
                            .limit(1);

                        if (existingSettings.length > 0) {
                            await db
                                .update(quizEvaluationSettingsTable)
                                .set(scoringUpdate)
                                .where(eq(quizEvaluationSettingsTable.id, input.quizId));
                        } else {
                            // Should not happen if created correctly, but handle it
                            await db.insert(quizEvaluationSettingsTable).values({
                                id: input.quizId,
                                ...scoringUpdate,
                            });
                        }
                    }
                }

                logger.info({ userId, quizId: input.quizId }, "Quiz updated successfully");

                return { quizId: input.quizId };
            } catch (error) {
                logger.error(
                    { error, userId: ctx.session.user.id, quizId: input.quizId },
                    "Error updating quiz"
                );
                throw error;
            }
        }),

    getResultsBatches: facultyAndManagerProcedure
        .input(
            z.object({
                quizId: z.uuid(),
            })
        )
        .query(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                const quizAccess = await db
                    .select({
                        quizId: quizzesTable.id,
                        isInstructor: courseInstructorsTable.instructorId,
                        isManager: semesterManagersTable.managerId,
                    })
                    .from(quizzesTable)
                    .innerJoin(courseQuizzesTable, eq(courseQuizzesTable.quizId, quizzesTable.id))
                    .innerJoin(coursesTable, eq(coursesTable.id, courseQuizzesTable.courseId))
                    .leftJoin(
                        courseInstructorsTable,
                        and(
                            eq(courseInstructorsTable.courseId, coursesTable.id),
                            eq(courseInstructorsTable.instructorId, userId)
                        )
                    )
                    .leftJoin(
                        semesterManagersTable,
                        and(
                            eq(semesterManagersTable.semesterId, coursesTable.semesterId),
                            eq(semesterManagersTable.managerId, userId)
                        )
                    )
                    .where(eq(quizzesTable.id, input.quizId))
                    .limit(1);

                if (
                    quizAccess.length === 0 ||
                    (!quizAccess[0].isInstructor && !quizAccess[0].isManager)
                ) {
                    throw new Error("Quiz not found or unauthorized");
                }

                const batches = await db
                    .select({
                        id: batchesTable.id,
                        name: batchesTable.name,
                        section: batchesTable.section,
                        joinYear: batchesTable.joinYear,
                    })
                    .from(quizBatchesTable)
                    .innerJoin(batchesTable, eq(batchesTable.id, quizBatchesTable.batchId))
                    .where(eq(quizBatchesTable.quizId, input.quizId))
                    .orderBy(asc(batchesTable.name));

                return batches;
            } catch (error) {
                logger.error(
                    { error, userId: ctx.session.user.id, quizId: input.quizId },
                    "Error getting quiz results batches"
                );
                throw error;
            }
        }),

    getStudentResponses: facultyAndManagerProcedure
        .input(
            z.object({
                quizId: z.uuid(),
                batchIds: z.array(z.uuid()).optional(),
                showIndividualOnly: z.boolean().optional(),
                searchTerm: z.string().optional(),
                limit: z.number().min(1).max(100).default(50),
                offset: z.number().min(0).default(0),
            })
        )
        .query(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                const quizAccess = await db
                    .select({
                        quizId: quizzesTable.id,
                        isInstructor: courseInstructorsTable.instructorId,
                        isManager: semesterManagersTable.managerId,
                    })
                    .from(quizzesTable)
                    .innerJoin(courseQuizzesTable, eq(courseQuizzesTable.quizId, quizzesTable.id))
                    .innerJoin(coursesTable, eq(coursesTable.id, courseQuizzesTable.courseId))
                    .leftJoin(
                        courseInstructorsTable,
                        and(
                            eq(courseInstructorsTable.courseId, coursesTable.id),
                            eq(courseInstructorsTable.instructorId, userId)
                        )
                    )
                    .leftJoin(
                        semesterManagersTable,
                        and(
                            eq(semesterManagersTable.semesterId, coursesTable.semesterId),
                            eq(semesterManagersTable.managerId, userId)
                        )
                    )
                    .where(eq(quizzesTable.id, input.quizId))
                    .limit(1);

                if (
                    quizAccess.length === 0 ||
                    (!quizAccess[0].isInstructor && !quizAccess[0].isManager)
                ) {
                    throw new Error("Quiz not found or unauthorized");
                }

                const conditions = [eq(quizResponseTable.quizId, input.quizId)];

                if (input.showIndividualOnly) {
                    const individualStudentIds = await db
                        .select({ studentId: studentQuizzesTable.studentId })
                        .from(studentQuizzesTable)
                        .where(eq(studentQuizzesTable.quizId, input.quizId));

                    if (individualStudentIds.length === 0) {
                        return { students: [], total: 0 };
                    }
                    conditions.push(
                        inArray(
                            quizResponseTable.studentId,
                            individualStudentIds.map((s) => s.studentId)
                        )
                    );
                } else if (input.batchIds && input.batchIds.length > 0) {
                    const batchStudentIds = await db
                        .select({ studentId: batchStudentsTable.studentId })
                        .from(batchStudentsTable)
                        .where(inArray(batchStudentsTable.batchId, input.batchIds));

                    if (batchStudentIds.length === 0) {
                        return { students: [], total: 0 };
                    }
                    conditions.push(
                        inArray(
                            quizResponseTable.studentId,
                            batchStudentIds.map((s) => s.studentId)
                        )
                    );
                }

                if (input.searchTerm) {
                    const searchCondition = or(
                        ilike(usersTable.name, `%${input.searchTerm}%`),
                        ilike(usersTable.email, `%${input.searchTerm}%`),
                        ilike(usersTable.profileId, `%${input.searchTerm}%`)
                    );
                    if (searchCondition) {
                        conditions.push(searchCondition);
                    }
                }

                const students = await db
                    .select({
                        id: usersTable.id,
                        name: usersTable.name,
                        email: usersTable.email,
                        profileId: usersTable.profileId,
                        profileImage: usersTable.profileImage,
                        submissionStatus: quizResponseTable.submissionStatus,
                        evaluationStatus: quizResponseTable.evaluationStatus,
                        score: quizResponseTable.score,
                        totalScore: quizResponseTable.totalScore,
                        startTime: quizResponseTable.startTime,
                        endTime: quizResponseTable.endTime,
                        submissionTime: quizResponseTable.submissionTime,
                        isViolated: quizResponseTable.isViolated,
                    })
                    .from(quizResponseTable)
                    .innerJoin(usersTable, eq(usersTable.id, quizResponseTable.studentId))
                    .where(and(...conditions))
                    .orderBy(asc(usersTable.name))
                    .limit(input.limit)
                    .offset(input.offset);

                const totalResult = await db
                    .select({ count: count() })
                    .from(quizResponseTable)
                    .innerJoin(usersTable, eq(usersTable.id, quizResponseTable.studentId))
                    .where(and(...conditions));

                return {
                    students,
                    total: Number(totalResult[0].count),
                };
            } catch (error) {
                logger.error(
                    { error, userId: ctx.session.user.id, quizId: input.quizId },
                    "Error getting student responses"
                );
                throw error;
            }
        }),

    getResultsStats: facultyAndManagerProcedure
        .input(z.object({ quizId: z.uuid() }))
        .query(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                const quizAccess = await db
                    .select({
                        quizId: quizzesTable.id,
                        isInstructor: courseInstructorsTable.instructorId,
                        isManager: semesterManagersTable.managerId,
                    })
                    .from(quizzesTable)
                    .innerJoin(courseQuizzesTable, eq(courseQuizzesTable.quizId, quizzesTable.id))
                    .innerJoin(coursesTable, eq(coursesTable.id, courseQuizzesTable.courseId))
                    .leftJoin(
                        courseInstructorsTable,
                        and(
                            eq(courseInstructorsTable.courseId, coursesTable.id),
                            eq(courseInstructorsTable.instructorId, userId)
                        )
                    )
                    .leftJoin(
                        semesterManagersTable,
                        and(
                            eq(semesterManagersTable.semesterId, coursesTable.semesterId),
                            eq(semesterManagersTable.managerId, userId)
                        )
                    )
                    .where(eq(quizzesTable.id, input.quizId))
                    .limit(1);

                if (
                    quizAccess.length === 0 ||
                    (!quizAccess[0].isInstructor && !quizAccess[0].isManager)
                ) {
                    throw new Error("Quiz not found or unauthorized");
                }

                const responses = await db
                    .select({
                        submissionStatus: quizResponseTable.submissionStatus,
                        isViolated: quizResponseTable.isViolated,
                    })
                    .from(quizResponseTable)
                    .where(eq(quizResponseTable.quizId, input.quizId));

                const total = responses.length;
                let submitted = 0;
                let violated = 0;

                for (const response of responses) {
                    if (
                        response.submissionStatus === "SUBMITTED" ||
                        response.submissionStatus === "AUTO_SUBMITTED"
                    ) {
                        submitted++;
                    }
                    if (response.isViolated) {
                        violated++;
                    }
                }

                return { total, submitted, violated };
            } catch (error) {
                logger.error(
                    { error, userId: ctx.session.user.id, quizId: input.quizId },
                    "Error getting results stats"
                );
                throw error;
            }
        }),

    /**
     * Get detailed student response for evaluation/viewing
     */
    getStudentResultDetails: facultyAndManagerProcedure
        .input(
            z.object({
                quizId: z.uuid(),
                studentId: z.uuid(),
            })
        )
        .query(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                // Verify access
                const quizAccess = await db
                    .select({
                        quizId: quizzesTable.id,
                        isInstructor: courseInstructorsTable.instructorId,
                        isManager: semesterManagersTable.managerId,
                    })
                    .from(quizzesTable)
                    .innerJoin(courseQuizzesTable, eq(courseQuizzesTable.quizId, quizzesTable.id))
                    .innerJoin(coursesTable, eq(coursesTable.id, courseQuizzesTable.courseId))
                    .leftJoin(
                        courseInstructorsTable,
                        and(
                            eq(courseInstructorsTable.courseId, coursesTable.id),
                            eq(courseInstructorsTable.instructorId, userId)
                        )
                    )
                    .leftJoin(
                        semesterManagersTable,
                        and(
                            eq(semesterManagersTable.semesterId, coursesTable.semesterId),
                            eq(semesterManagersTable.managerId, userId)
                        )
                    )
                    .where(eq(quizzesTable.id, input.quizId))
                    .limit(1);

                if (
                    quizAccess.length === 0 ||
                    (!quizAccess[0].isInstructor && !quizAccess[0].isManager)
                ) {
                    throw new Error("Quiz not found or unauthorized");
                }

                // Get student info
                const student = await db
                    .select({
                        id: usersTable.id,
                        name: usersTable.name,
                        email: usersTable.email,
                        profileId: usersTable.profileId,
                        profileImage: usersTable.profileImage,
                    })
                    .from(usersTable)
                    .where(eq(usersTable.id, input.studentId))
                    .limit(1);

                if (student.length === 0) {
                    throw new Error("Student not found");
                }

                // Get quiz response
                const responseData = await db
                    .select({
                        startTime: quizResponseTable.startTime,
                        endTime: quizResponseTable.endTime,
                        submissionTime: quizResponseTable.submissionTime,
                        submissionStatus: quizResponseTable.submissionStatus,
                        evaluationStatus: quizResponseTable.evaluationStatus,
                        score: quizResponseTable.score,
                        totalScore: quizResponseTable.totalScore,
                        response: quizResponseTable.response,
                        evaluationResults: quizResponseTable.evaluationResults,
                        isViolated: quizResponseTable.isViolated,
                        violations: quizResponseTable.violations,
                        ip: quizResponseTable.ip,
                    })
                    .from(quizResponseTable)
                    .where(
                        and(
                            eq(quizResponseTable.quizId, input.quizId),
                            eq(quizResponseTable.studentId, input.studentId)
                        )
                    )
                    .limit(1);

                if (responseData.length === 0) {
                    throw new Error("Student response not found");
                }

                // Get quiz questions with full question data
                const quizQuestions = await db
                    .select({
                        quizQuestionId: quizQuestionsTable.id,
                        orderIndex: quizQuestionsTable.orderIndex,
                        bankQuestionId: quizQuestionsTable.bankQuestionId,
                        questionId: questionsTable.id,
                        type: questionsTable.type,
                        question: questionsTable.question,
                        questionData: questionsTable.questionData,
                        solution: questionsTable.solution,
                        explanation: questionsTable.explanation,
                        marks: questionsTable.marks,
                        negativeMarks: questionsTable.negativeMarks,
                        difficulty: questionsTable.difficulty,
                        courseOutcome: questionsTable.courseOutcome,
                        bloomTaxonomyLevel: questionsTable.bloomTaxonomyLevel,
                    })
                    .from(quizQuestionsTable)
                    .innerJoin(questionsTable, eq(questionsTable.id, quizQuestionsTable.questionId))
                    .where(eq(quizQuestionsTable.quizId, input.quizId))
                    .orderBy(asc(quizQuestionsTable.orderIndex));

                // Get bank names for questions that came from banks
                const bankQuestionIds = quizQuestions
                    .filter((q) => q.bankQuestionId)
                    .map((q) => q.bankQuestionId!);

                let bankNameMap: Map<string, string> = new Map();
                if (bankQuestionIds.length > 0) {
                    const bankNames = await db
                        .select({
                            bankQuestionId: bankQuestionsTable.id,
                            bankName: banksTable.name,
                        })
                        .from(bankQuestionsTable)
                        .innerJoin(banksTable, eq(banksTable.id, bankQuestionsTable.bankId))
                        .where(inArray(bankQuestionsTable.id, bankQuestionIds));

                    bankNameMap = new Map(bankNames.map((b) => [b.bankQuestionId, b.bankName]));
                }

                // Get topics for all questions
                const questionIds = quizQuestions.map((q) => q.questionId);
                const topicsMap: Map<string, { topicId: string; topicName: string }[]> = new Map();
                if (questionIds.length > 0) {
                    const topicsData = await db
                        .select({
                            questionId: topicQuestionsTable.questionId,
                            topicId: topicsTable.id,
                            topicName: topicsTable.name,
                        })
                        .from(topicQuestionsTable)
                        .innerJoin(topicsTable, eq(topicsTable.id, topicQuestionsTable.topicId))
                        .where(inArray(topicQuestionsTable.questionId, questionIds));

                    for (const topic of topicsData) {
                        const existing = topicsMap.get(topic.questionId) || [];
                        existing.push({ topicId: topic.topicId, topicName: topic.topicName });
                        topicsMap.set(topic.questionId, existing);
                    }
                }

                // Format questions for the frontend
                const questions = quizQuestions.map((q) => ({
                    id: q.questionId,
                    quizQuestionId: q.quizQuestionId,
                    orderIndex: q.orderIndex,
                    type: q.type,
                    question: q.question,
                    questionData: q.questionData,
                    solution: q.solution,
                    explanation: q.explanation,
                    marks: q.marks,
                    negativeMarks: q.negativeMarks ?? 0,
                    difficulty: q.difficulty,
                    courseOutcome: q.courseOutcome,
                    bloomTaxonomyLevel: q.bloomTaxonomyLevel,
                    bankName: q.bankQuestionId ? bankNameMap.get(q.bankQuestionId) : null,
                    topics: topicsMap.get(q.questionId) || [],
                }));

                return {
                    student: student[0],
                    response: responseData[0],
                    questions,
                };
            } catch (error) {
                logger.error(
                    {
                        error,
                        userId: ctx.session.user.id,
                        quizId: input.quizId,
                        studentId: input.studentId,
                    },
                    "Error getting student result details"
                );
                throw error;
            }
        }),

    /**
     * Update evaluation results for a student's quiz response
     */
    updateEvaluationResults: facultyAndManagerProcedure
        .input(
            z.object({
                quizId: z.uuid(),
                studentId: z.uuid(),
                evaluationResults: z.object({
                    data: z.record(
                        z.string(),
                        z.object({
                            status: z.enum(["UNEVALUATED", "EVALUATED", "EVALUATED_MANUALLY"]),
                            mark: z.number(),
                            remarks: z.string().optional(),
                        })
                    ),
                    v: z.string(),
                }),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                // Verify access
                const quizAccess = await db
                    .select({
                        quizId: quizzesTable.id,
                        isInstructor: courseInstructorsTable.instructorId,
                        isManager: semesterManagersTable.managerId,
                    })
                    .from(quizzesTable)
                    .innerJoin(courseQuizzesTable, eq(courseQuizzesTable.quizId, quizzesTable.id))
                    .innerJoin(coursesTable, eq(coursesTable.id, courseQuizzesTable.courseId))
                    .leftJoin(
                        courseInstructorsTable,
                        and(
                            eq(courseInstructorsTable.courseId, coursesTable.id),
                            eq(courseInstructorsTable.instructorId, userId)
                        )
                    )
                    .leftJoin(
                        semesterManagersTable,
                        and(
                            eq(semesterManagersTable.semesterId, coursesTable.semesterId),
                            eq(semesterManagersTable.managerId, userId)
                        )
                    )
                    .where(eq(quizzesTable.id, input.quizId))
                    .limit(1);

                if (
                    quizAccess.length === 0 ||
                    (!quizAccess[0].isInstructor && !quizAccess[0].isManager)
                ) {
                    throw new Error("Quiz not found or unauthorized");
                }

                // Calculate total score from evaluation results
                let totalAwardedScore = 0;
                const evaluationData = input.evaluationResults.data;
                for (const questionId in evaluationData) {
                    totalAwardedScore += evaluationData[questionId].mark;
                }

                // Determine evaluation status
                const allEvaluated = Object.values(evaluationData).every(
                    (e) => e.status !== "UNEVALUATED"
                );
                const hasManualEvaluation = Object.values(evaluationData).some(
                    (e) => e.status === "EVALUATED_MANUALLY"
                );

                let evaluationStatus: "NOT_EVALUATED" | "EVALUATED" | "EVALUATED_MANUALLY" =
                    "NOT_EVALUATED";
                if (allEvaluated) {
                    evaluationStatus = hasManualEvaluation ? "EVALUATED_MANUALLY" : "EVALUATED";
                }

                // Update quiz response
                await db
                    .update(quizResponseTable)
                    .set({
                        evaluationResults: input.evaluationResults,
                        score: String(totalAwardedScore),
                        evaluationStatus: evaluationStatus,
                        updated_at: new Date(),
                    })
                    .where(
                        and(
                            eq(quizResponseTable.quizId, input.quizId),
                            eq(quizResponseTable.studentId, input.studentId)
                        )
                    );

                logger.info(
                    {
                        userId,
                        quizId: input.quizId,
                        studentId: input.studentId,
                        newScore: totalAwardedScore,
                        evaluationStatus,
                    },
                    "Evaluation results updated successfully"
                );

                return { success: true, score: totalAwardedScore, evaluationStatus };
            } catch (error) {
                logger.error(
                    {
                        error,
                        userId: ctx.session.user.id,
                        quizId: input.quizId,
                        studentId: input.studentId,
                    },
                    "Error updating evaluation results"
                );
                throw error;
            }
        }),
});
