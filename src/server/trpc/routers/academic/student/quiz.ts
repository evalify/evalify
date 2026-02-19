import { z } from "zod";
import { createTRPCRouter, studentProcedure } from "../../../trpc";
import { db } from "@/db";
import {
    quizzesTable,
    courseQuizzesTable,
    studentQuizzesTable,
    quizBatchesTable,
    labQuizzesTable,
} from "@/db/schema/quiz/quiz";
import { quizResponseTable } from "@/db/schema/quiz/quiz-response";
import { coursesTable } from "@/db/schema/course/course";
import { courseStudentsTable } from "@/db/schema/course/course-student";
import { usersTable } from "@/db/schema/user/user";
import { batchStudentsTable } from "@/db/schema/batch/batch-student";
import { labsTable } from "@/db/schema/lab/lab";
import { eq, and, desc, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { TRPCError } from "@trpc/server";
import { getClientIp, isClientInLabSubnets } from "@/lib/ip-utils";
import { getStudentQuizStatus } from "./utils";

/**
 * Student quiz router
 * Handles quiz listing for students within a course
 */
export const studentQuizRouter = createTRPCRouter({
    /**
     * List all quizzes for a student across all their courses
     * Returns quizzes with status calculated based on current time
     * Status can be: "active", "completed", "missed", "upcoming"
     */
    listAll: studentProcedure
        .input(
            z.object({
                searchTerm: z.string().optional(),
                status: z.enum(["active", "completed", "missed", "upcoming", "all"]).default("all"),
            })
        )
        .query(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                // Get student's batch IDs
                const studentBatchIds = await db
                    .select({ batchId: batchStudentsTable.batchId })
                    .from(batchStudentsTable)
                    .where(eq(batchStudentsTable.studentId, userId));

                // Get student's enrolled course IDs
                const studentCourses = await db
                    .select({ courseId: courseStudentsTable.courseId })
                    .from(courseStudentsTable)
                    .where(eq(courseStudentsTable.studentId, userId));

                const studentCourseIds = new Set(studentCourses.map((c) => c.courseId));

                // Get all quizzes from all courses
                const quizzes = await db
                    .select({
                        id: quizzesTable.id,
                        name: quizzesTable.name,
                        description: quizzesTable.description,
                        instructions: quizzesTable.instructions,
                        startTime: quizzesTable.startTime,
                        endTime: quizzesTable.endTime,
                        duration: quizzesTable.duration,
                        publishQuiz: quizzesTable.publishQuiz,
                        publishResult: quizzesTable.publishResult,
                        createdAt: quizzesTable.created_at,
                        courseName: coursesTable.name,
                        courseCode: coursesTable.code,
                        courseId: coursesTable.id,
                        instructorName: usersTable.name,
                        instructorEmail: usersTable.email,
                        instructorImage: usersTable.profileImage,
                    })
                    .from(quizzesTable)
                    .innerJoin(courseQuizzesTable, eq(quizzesTable.id, courseQuizzesTable.quizId))
                    .innerJoin(coursesTable, eq(courseQuizzesTable.courseId, coursesTable.id))
                    .leftJoin(usersTable, eq(quizzesTable.createdById, usersTable.id))
                    .where(eq(quizzesTable.publishQuiz, true))
                    .orderBy(desc(quizzesTable.startTime));

                // Filter quizzes based on student assignment
                const accessibleQuizIds: string[] = [];

                for (const quiz of quizzes) {
                    // Check if quiz is assigned to student directly
                    const directAssignment = await db
                        .select()
                        .from(studentQuizzesTable)
                        .where(
                            and(
                                eq(studentQuizzesTable.quizId, quiz.id),
                                eq(studentQuizzesTable.studentId, userId)
                            )
                        )
                        .limit(1);

                    if (directAssignment.length > 0) {
                        accessibleQuizIds.push(quiz.id);
                        continue;
                    }

                    // Check if quiz is assigned to any of student's batches
                    if (studentBatchIds.length > 0) {
                        const batchAssignment = await db
                            .select()
                            .from(quizBatchesTable)
                            .where(
                                and(
                                    eq(quizBatchesTable.quizId, quiz.id),
                                    inArray(
                                        quizBatchesTable.batchId,
                                        studentBatchIds.map((b) => b.batchId)
                                    )
                                )
                            )
                            .limit(1);

                        if (batchAssignment.length > 0) {
                            accessibleQuizIds.push(quiz.id);
                        }
                    }
                }

                // Filter and enhance quizzes with status (use helper for per-student status)
                const accessibleQuizzes = quizzes.filter((quiz) =>
                    accessibleQuizIds.includes(quiz.id)
                );

                // Group quizzes by quiz ID to handle multiple courses per quiz
                const quizMap = new Map<
                    string,
                    (typeof accessibleQuizzes)[0] & {
                        courses: Array<{
                            id: string;
                            name: string | null;
                            code: string | null;
                        }>;
                    }
                >();

                for (const quiz of accessibleQuizzes) {
                    // Only include courses that the student is actually enrolled in
                    if (!studentCourseIds.has(quiz.courseId)) {
                        continue;
                    }

                    if (!quizMap.has(quiz.id)) {
                        quizMap.set(quiz.id, {
                            ...quiz,
                            courses: [
                                {
                                    id: quiz.courseId,
                                    name: quiz.courseName,
                                    code: quiz.courseCode,
                                },
                            ],
                            // Keep first course info for backward compatibility
                            courseId: quiz.courseId,
                            courseName: quiz.courseName,
                            courseCode: quiz.courseCode,
                        });
                    } else {
                        // Add additional course to existing quiz (only if student is enrolled)
                        const existing = quizMap.get(quiz.id);
                        if (existing) {
                            existing.courses.push({
                                id: quiz.courseId,
                                name: quiz.courseName,
                                code: quiz.courseCode,
                            });
                        }
                    }
                }

                const uniqueQuizzes = Array.from(quizMap.values());

                let filteredQuizzes = await Promise.all(
                    uniqueQuizzes.map(async (quiz) => {
                        const studentStatus = await getStudentQuizStatus(
                            quiz.id,
                            userId,
                            quiz.startTime,
                            quiz.endTime
                        );
                        // map helper result to lowercase values used by this API
                        const statusMap: Record<
                            string,
                            "active" | "completed" | "missed" | "upcoming"
                        > = {
                            ACTIVE: "active",
                            COMPLETED: "completed",
                            MISSED: "missed",
                            UPCOMING: "upcoming",
                        } as const;

                        const status = statusMap[studentStatus] ?? "active";

                        return {
                            ...quiz,
                            status,
                        };
                    })
                );

                // Apply search filter
                if (input.searchTerm) {
                    const searchLower = input.searchTerm.toLowerCase();
                    filteredQuizzes = filteredQuizzes.filter(
                        (quiz) =>
                            quiz.name.toLowerCase().includes(searchLower) ||
                            quiz.description?.toLowerCase().includes(searchLower) ||
                            quiz.courses.some(
                                (course: {
                                    id: string;
                                    name: string | null;
                                    code: string | null;
                                }) =>
                                    course.name?.toLowerCase().includes(searchLower) ||
                                    course.code?.toLowerCase().includes(searchLower)
                            )
                    );
                }

                // Apply status filter
                if (input.status !== "all") {
                    filteredQuizzes = filteredQuizzes.filter(
                        (quiz) => quiz.status === input.status
                    );
                }

                logger.info(
                    {
                        userId,
                        count: filteredQuizzes.length,
                        status: input.status,
                    },
                    "Student all quizzes listed"
                );

                return {
                    quizzes: filteredQuizzes,
                };
            } catch (error) {
                logger.error(
                    { error, userId: ctx.session.user.id },
                    "Error listing all student quizzes"
                );
                throw error;
            }
        }),

    /**
     * List quizzes for a student in a specific course
     * Returns quizzes with status calculated based on current time
     * Status can be: "active", "completed", "missed"
     */
    listByCourse: studentProcedure
        .input(
            z.object({
                courseId: z.uuid(),
                searchTerm: z.string().optional(),
                status: z.enum(["active", "completed", "missed", "all"]).default("all"),
                limit: z.number().min(1).max(100).default(12),
                offset: z.number().min(0).default(0),
            })
        )
        .query(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;
                const _now = new Date();

                // Verify student has access to this course
                const courseAccess = await db
                    .select({ courseId: coursesTable.id })
                    .from(coursesTable)
                    .where(eq(coursesTable.id, input.courseId))
                    .limit(1);

                if (courseAccess.length === 0) {
                    throw new Error("Course not found");
                }

                // Get student's batch IDs
                const studentBatchIds = await db
                    .select({ batchId: batchStudentsTable.batchId })
                    .from(batchStudentsTable)
                    .where(eq(batchStudentsTable.studentId, userId));

                // Build base query for quizzes
                // A student can access a quiz if:
                // 1. Quiz is assigned to the course
                // 2. Quiz is published (publishQuiz = true)
                // 3. Quiz is assigned to student directly OR assigned to student's batch

                const quizzes = await db
                    .select({
                        id: quizzesTable.id,
                        name: quizzesTable.name,
                        description: quizzesTable.description,
                        instructions: quizzesTable.instructions,
                        startTime: quizzesTable.startTime,
                        endTime: quizzesTable.endTime,
                        duration: quizzesTable.duration,
                        publishQuiz: quizzesTable.publishQuiz,
                        publishResult: quizzesTable.publishResult,
                        createdAt: quizzesTable.created_at,
                        courseName: coursesTable.name,
                        courseCode: coursesTable.code,
                        instructorName: usersTable.name,
                        instructorEmail: usersTable.email,
                        instructorImage: usersTable.profileImage,
                    })
                    .from(quizzesTable)
                    .innerJoin(courseQuizzesTable, eq(quizzesTable.id, courseQuizzesTable.quizId))
                    .innerJoin(coursesTable, eq(courseQuizzesTable.courseId, coursesTable.id))
                    .leftJoin(usersTable, eq(quizzesTable.createdById, usersTable.id))
                    .where(
                        and(
                            eq(courseQuizzesTable.courseId, input.courseId),
                            eq(quizzesTable.publishQuiz, true)
                        )
                    )
                    .orderBy(desc(quizzesTable.startTime));

                // Filter quizzes based on student assignment
                const accessibleQuizIds: string[] = [];

                for (const quiz of quizzes) {
                    // Check if quiz is assigned to student directly
                    const directAssignment = await db
                        .select()
                        .from(studentQuizzesTable)
                        .where(
                            and(
                                eq(studentQuizzesTable.quizId, quiz.id),
                                eq(studentQuizzesTable.studentId, userId)
                            )
                        )
                        .limit(1);

                    if (directAssignment.length > 0) {
                        accessibleQuizIds.push(quiz.id);
                        continue;
                    }

                    // Check if quiz is assigned to any of student's batches
                    if (studentBatchIds.length > 0) {
                        const batchAssignment = await db
                            .select()
                            .from(quizBatchesTable)
                            .where(
                                and(
                                    eq(quizBatchesTable.quizId, quiz.id),
                                    inArray(
                                        quizBatchesTable.batchId,
                                        studentBatchIds.map((b) => b.batchId)
                                    )
                                )
                            )
                            .limit(1);

                        if (batchAssignment.length > 0) {
                            accessibleQuizIds.push(quiz.id);
                        }
                    }
                }

                // Filter and enhance quizzes with status (use helper for per-student status)
                const accessibleQuizzes = quizzes.filter((quiz) =>
                    accessibleQuizIds.includes(quiz.id)
                );
                let filteredQuizzes = await Promise.all(
                    accessibleQuizzes.map(async (quiz) => {
                        const studentStatus = await getStudentQuizStatus(
                            quiz.id,
                            userId,
                            quiz.startTime,
                            quiz.endTime
                        );
                        // map helper result to lowercase values used by this API
                        const statusMap: Record<string, "active" | "completed" | "missed"> = {
                            ACTIVE: "active",
                            COMPLETED: "completed",
                            MISSED: "missed",
                        } as const;

                        const status = statusMap[studentStatus] ?? "active";

                        return {
                            ...quiz,
                            status,
                        };
                    })
                );

                // Apply search filter
                if (input.searchTerm) {
                    const searchLower = input.searchTerm.toLowerCase();
                    filteredQuizzes = filteredQuizzes.filter(
                        (quiz) =>
                            quiz.name.toLowerCase().includes(searchLower) ||
                            quiz.description?.toLowerCase().includes(searchLower) ||
                            quiz.courseName?.toLowerCase().includes(searchLower)
                    );
                }

                // Apply status filter
                if (input.status !== "all") {
                    filteredQuizzes = filteredQuizzes.filter(
                        (quiz) => quiz.status === input.status
                    );
                }

                // Apply pagination
                const total = filteredQuizzes.length;
                const paginatedQuizzes = filteredQuizzes.slice(
                    input.offset,
                    input.offset + input.limit
                );

                logger.info(
                    {
                        userId,
                        courseId: input.courseId,
                        count: paginatedQuizzes.length,
                        total,
                    },
                    "Student quizzes listed"
                );

                return {
                    quizzes: paginatedQuizzes,
                    total,
                };
            } catch (error) {
                logger.error(
                    { error, userId: ctx.session.user.id, courseId: input.courseId },
                    "Error listing student quizzes"
                );
                throw error;
            }
        }),

    /**
     * Get detailed quiz information by ID
     * Returns all quiz settings, course info, instructor details, and lab requirements
     * Access is restricted to 5 minutes before quiz start time
     * If labs are assigned, verifies client IP belongs to lab subnet
     */
    getById: studentProcedure
        .input(z.object({ quizId: z.uuid() }))
        .query(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;
                const now = new Date();

                // Fetch quiz with all related information
                const quizResult = await db
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
                        createdById: quizzesTable.createdById,
                    })
                    .from(quizzesTable)
                    .where(eq(quizzesTable.id, input.quizId))
                    .limit(1);

                if (quizResult.length === 0) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Quiz not found",
                    });
                }

                const quiz = quizResult[0];

                // Check if current time is within 5 minutes before quiz start
                const startTime = new Date(quiz.startTime);
                const fiveMinutesBeforeStart = new Date(startTime.getTime() - 5 * 60 * 1000);

                if (now < fiveMinutesBeforeStart) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: `Quiz instructions will be available ${Math.ceil((fiveMinutesBeforeStart.getTime() - now.getTime()) / (1000 * 60))} minutes before the quiz starts`,
                    });
                }

                // Verify student has access to this quiz
                const studentBatchIds = await db
                    .select({ batchId: batchStudentsTable.batchId })
                    .from(batchStudentsTable)
                    .where(eq(batchStudentsTable.studentId, userId));

                // Check direct assignment
                const directAssignment = await db
                    .select()
                    .from(studentQuizzesTable)
                    .where(
                        and(
                            eq(studentQuizzesTable.quizId, quiz.id),
                            eq(studentQuizzesTable.studentId, userId)
                        )
                    )
                    .limit(1);

                let hasAccess = directAssignment.length > 0;

                // Check batch assignment if not directly assigned
                if (!hasAccess && studentBatchIds.length > 0) {
                    const batchAssignment = await db
                        .select()
                        .from(quizBatchesTable)
                        .where(
                            and(
                                eq(quizBatchesTable.quizId, quiz.id),
                                inArray(
                                    quizBatchesTable.batchId,
                                    studentBatchIds.map((b) => b.batchId)
                                )
                            )
                        )
                        .limit(1);

                    hasAccess = batchAssignment.length > 0;
                }

                if (!hasAccess) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "You don't have access to this quiz",
                    });
                }

                // Get course information - only courses the student is enrolled in
                const courseInfo = await db
                    .select({
                        id: coursesTable.id,
                        name: coursesTable.name,
                        code: coursesTable.code,
                    })
                    .from(coursesTable)
                    .innerJoin(courseQuizzesTable, eq(coursesTable.id, courseQuizzesTable.courseId))
                    .innerJoin(
                        courseStudentsTable,
                        eq(coursesTable.id, courseStudentsTable.courseId)
                    )
                    .where(
                        and(
                            eq(courseQuizzesTable.quizId, quiz.id),
                            eq(courseStudentsTable.studentId, userId)
                        )
                    );

                // Get instructor information
                let instructorInfo = null;
                if (quiz.createdById) {
                    const instructorResult = await db
                        .select({
                            id: usersTable.id,
                            name: usersTable.name,
                            email: usersTable.email,
                            profileImage: usersTable.profileImage,
                        })
                        .from(usersTable)
                        .where(eq(usersTable.id, quiz.createdById))
                        .limit(1);

                    if (instructorResult.length > 0) {
                        instructorInfo = instructorResult[0];
                    }
                }

                // Get lab information
                const labInfo = await db
                    .select({
                        id: labsTable.id,
                        name: labsTable.name,
                        block: labsTable.block,
                        ipSubnet: labsTable.ipSubnet,
                    })
                    .from(labsTable)
                    .innerJoin(labQuizzesTable, eq(labsTable.id, labQuizzesTable.labId))
                    .where(eq(labQuizzesTable.quizId, quiz.id));

                // Check IP verification if labs are assigned
                const clientIp = getClientIp(ctx.headers);
                const labSubnets = labInfo.map((lab) => lab.ipSubnet).filter(Boolean);
                const isInLabSubnet =
                    labSubnets.length > 0 ? isClientInLabSubnets(clientIp, labSubnets) : true;

                logger.info(
                    {
                        userId,
                        quizId: quiz.id,
                        clientIp,
                        labSubnets,
                        isInLabSubnet,
                    },
                    "IP verification check"
                );

                // Fetch student's quiz response to get their personal start/end times
                const studentQuizResponse = await db
                    .select({
                        startTime: quizResponseTable.startTime,
                        endTime: quizResponseTable.endTime,
                        duration: quizResponseTable.duration,
                        submissionStatus: quizResponseTable.submissionStatus,
                    })
                    .from(quizResponseTable)
                    .where(
                        and(
                            eq(quizResponseTable.quizId, quiz.id),
                            eq(quizResponseTable.studentId, userId)
                        )
                    )
                    .limit(1);

                // Determine student-specific status using helper
                const studentStatus = await getStudentQuizStatus(
                    quiz.id,
                    userId,
                    quiz.startTime,
                    quiz.endTime
                );
                const status = (studentStatus as string).toUpperCase() as
                    | "UPCOMING"
                    | "ACTIVE"
                    | "COMPLETED"
                    | "MISSED";

                logger.info({ userId, quizId: quiz.id, status }, "Student quiz details fetched");

                return {
                    ...quiz,
                    status,
                    isProtected: !!quiz.password,
                    isInLabSubnet, // Whether client IP is in lab subnet (or no labs assigned)
                    courses: courseInfo,
                    instructor: instructorInfo,
                    labs: labInfo,
                    // Include student's personal timing from their quiz response
                    studentStartTime:
                        studentQuizResponse.length > 0 ? studentQuizResponse[0].startTime : null,
                    studentEndTime:
                        studentQuizResponse.length > 0 ? studentQuizResponse[0].endTime : null,
                    studentDuration:
                        studentQuizResponse.length > 0 ? studentQuizResponse[0].duration : null,
                };
            } catch (error) {
                if (error instanceof TRPCError) {
                    throw error;
                }
                logger.error(
                    { error, userId: ctx.session.user.id, quizId: input.quizId },
                    "Error fetching student quiz details"
                );
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to fetch quiz details",
                });
            }
        }),
});
