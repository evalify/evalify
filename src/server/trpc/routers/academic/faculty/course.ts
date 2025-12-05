import { z } from "zod";
import { createTRPCRouter, facultyAndManagerProcedure } from "../../../trpc";
import { db } from "@/db";
import {
    coursesTable,
    courseInstructorsTable,
    courseStudentsTable,
    courseBatchesTable,
    semestersTable,
    semesterManagersTable,
    usersTable,
    labsTable,
    batchesTable,
    batchStudentsTable,
} from "@/db/schema";
import { eq, and, or, ilike, desc, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Faculty/Manager course router
 * Handles course listing for faculty (as instructor) and managers (via semester management)
 */
export const facultyCourseRouter = createTRPCRouter({
    /**
     * List courses for faculty/manager
     * - Faculty: courses where they are instructors
     * - Manager: courses in semesters they manage (managers can also be faculty)
     */
    list: facultyAndManagerProcedure
        .input(
            z.object({
                searchTerm: z.string().optional(),
                type: z.enum(["CORE", "ELECTIVE", "MICRO_CREDENTIAL", "ALL"]).default("ALL"),
                isActive: z.enum(["ACTIVE", "INACTIVE", "ALL"]).default("ACTIVE"),
                limit: z.number().min(1).max(100).default(12),
                offset: z.number().min(0).default(0),
            })
        )
        .query(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                // Get course IDs where user is an instructor
                const instructorCourseIds = await db
                    .select({ courseId: courseInstructorsTable.courseId })
                    .from(courseInstructorsTable)
                    .where(eq(courseInstructorsTable.instructorId, userId));

                // Get semester IDs managed by user
                const managedSemesterIds = await db
                    .select({ semesterId: semesterManagersTable.semesterId })
                    .from(semesterManagersTable)
                    .where(eq(semesterManagersTable.managerId, userId));

                // Get course IDs from managed semesters
                const managedCourseIds =
                    managedSemesterIds.length > 0
                        ? await db
                              .select({ courseId: coursesTable.id })
                              .from(coursesTable)
                              .where(
                                  inArray(
                                      coursesTable.semesterId,
                                      managedSemesterIds.map((s) => s.semesterId)
                                  )
                              )
                        : [];

                // Combine and deduplicate course IDs
                const allCourseIds = Array.from(
                    new Set([
                        ...instructorCourseIds.map((c) => c.courseId),
                        ...managedCourseIds.map((c) => c.courseId),
                    ])
                );

                if (allCourseIds.length === 0) {
                    return { courses: [], total: 0 };
                }

                // Build conditions for filtering
                const conditions = [inArray(coursesTable.id, allCourseIds)];

                if (input.type !== "ALL") {
                    conditions.push(eq(coursesTable.type, input.type));
                }

                if (input.isActive !== "ALL") {
                    conditions.push(eq(coursesTable.isActive, input.isActive));
                }

                if (input.searchTerm) {
                    const searchCondition = or(
                        ilike(coursesTable.name, `%${input.searchTerm}%`),
                        ilike(coursesTable.code, `%${input.searchTerm}%`),
                        ilike(coursesTable.description, `%${input.searchTerm}%`)
                    );
                    if (searchCondition) {
                        conditions.push(searchCondition);
                    }
                }

                // Get courses with pagination
                const courses = await db
                    .select({
                        id: coursesTable.id,
                        name: coursesTable.name,
                        description: coursesTable.description,
                        code: coursesTable.code,
                        image: coursesTable.image,
                        type: coursesTable.type,
                        semesterId: coursesTable.semesterId,
                        isActive: coursesTable.isActive,
                        createdAt: coursesTable.created_at,
                        updatedAt: coursesTable.updated_at,
                        semesterName: semestersTable.name,
                        semesterYear: semestersTable.year,
                    })
                    .from(coursesTable)
                    .leftJoin(semestersTable, eq(coursesTable.semesterId, semestersTable.id))
                    .where(and(...conditions))
                    .orderBy(desc(coursesTable.created_at))
                    .limit(input.limit)
                    .offset(input.offset);

                // Get total count with same filters
                const totalResult = await db
                    .select({ id: coursesTable.id })
                    .from(coursesTable)
                    .where(and(...conditions));

                logger.info(
                    { userId, count: courses.length, total: totalResult.length },
                    "Faculty/Manager courses listed"
                );

                return {
                    courses,
                    total: totalResult.length,
                };
            } catch (error) {
                logger.error({ error, userId: ctx.session.user.id }, "Error listing courses");
                throw error;
            }
        }),

    /**
     * Get all students from instructor's courses
     */
    getStudentsByInstructor: facultyAndManagerProcedure.query(async ({ ctx }) => {
        try {
            const userId = ctx.session.user.id;

            // Get course IDs where user is an instructor
            const instructorCourses = await db
                .select({ courseId: courseInstructorsTable.courseId })
                .from(courseInstructorsTable)
                .where(eq(courseInstructorsTable.instructorId, userId));

            const courseIds = instructorCourses.map((c) => c.courseId);

            if (courseIds.length === 0) {
                return [];
            }

            // Get all students from these courses with course details
            const studentsWithCourses = await db
                .select({
                    studentId: usersTable.id,
                    studentName: usersTable.name,
                    studentEmail: usersTable.email,
                    studentProfileId: usersTable.profileId,
                    studentBatchId: batchStudentsTable.batchId,
                    courseId: coursesTable.id,
                    courseName: coursesTable.name,
                    courseCode: coursesTable.code,
                })
                .from(courseStudentsTable)
                .innerJoin(usersTable, eq(courseStudentsTable.studentId, usersTable.id))
                .innerJoin(coursesTable, eq(courseStudentsTable.courseId, coursesTable.id))
                .leftJoin(batchStudentsTable, eq(batchStudentsTable.studentId, usersTable.id))
                .where(inArray(courseStudentsTable.courseId, courseIds))
                .orderBy(usersTable.name);

            // Group students by course
            const courseStudentMap = new Map();
            studentsWithCourses.forEach((row) => {
                if (!courseStudentMap.has(row.courseId)) {
                    courseStudentMap.set(row.courseId, {
                        courseId: row.courseId,
                        courseName: row.courseName,
                        courseCode: row.courseCode,
                        students: [],
                    });
                }
                courseStudentMap.get(row.courseId).students.push({
                    id: row.studentId,
                    name: row.studentName,
                    email: row.studentEmail,
                    profileId: row.studentProfileId,
                    batchId: row.studentBatchId,
                });
            });

            const result = Array.from(courseStudentMap.values());

            logger.info({ userId, courseCount: result.length }, "Students by instructor retrieved");

            return result;
        } catch (error) {
            logger.error(
                { error, userId: ctx.session.user.id },
                "Error getting students by instructor"
            );
            throw error;
        }
    }),

    /**
     * Get all labs (available for quiz assignment)
     */
    getAllLabs: facultyAndManagerProcedure.query(async ({ ctx }) => {
        try {
            const labs = await db
                .select({
                    id: labsTable.id,
                    name: labsTable.name,
                    block: labsTable.block,
                    ipSubnet: labsTable.ipSubnet,
                    isActive: labsTable.isActive,
                })
                .from(labsTable)
                .where(eq(labsTable.isActive, "ACTIVE"))
                .orderBy(labsTable.name);

            logger.info({ userId: ctx.session.user.id, count: labs.length }, "Labs retrieved");

            return labs;
        } catch (error) {
            logger.error({ error, userId: ctx.session.user.id }, "Error getting labs");
            throw error;
        }
    }),

    /**
     * Get all batches (available for quiz assignment)
     */
    getAllBatches: facultyAndManagerProcedure.query(async ({ ctx }) => {
        try {
            const batches = await db
                .select({
                    id: batchesTable.id,
                    name: batchesTable.name,
                    joinYear: batchesTable.joinYear,
                    graduationYear: batchesTable.graduationYear,
                    section: batchesTable.section,
                    departmentId: batchesTable.departmentId,
                    isActive: batchesTable.isActive,
                })
                .from(batchesTable)
                .where(eq(batchesTable.isActive, "ACTIVE"))
                .orderBy(desc(batchesTable.graduationYear), batchesTable.section);

            logger.info(
                { userId: ctx.session.user.id, count: batches.length },
                "Batches retrieved"
            );

            return batches;
        } catch (error) {
            logger.error({ error, userId: ctx.session.user.id }, "Error getting batches");
            throw error;
        }
    }),

    /**
     * Get batches for specific courses (using course-batch relationship)
     * This is used to show only relevant batches when courses are selected in quiz creation
     */
    getBatchesByCourses: facultyAndManagerProcedure
        .input(
            z.object({
                courseIds: z.array(z.string().uuid()),
            })
        )
        .query(async ({ input, ctx }) => {
            try {
                if (input.courseIds.length === 0) {
                    return [];
                }

                // Get batches associated with the selected courses via courseBatchesTable
                const batches = await db
                    .select({
                        id: batchesTable.id,
                        name: batchesTable.name,
                        joinYear: batchesTable.joinYear,
                        graduationYear: batchesTable.graduationYear,
                        section: batchesTable.section,
                        departmentId: batchesTable.departmentId,
                        isActive: batchesTable.isActive,
                        courseId: courseBatchesTable.courseId,
                    })
                    .from(courseBatchesTable)
                    .innerJoin(batchesTable, eq(courseBatchesTable.batchId, batchesTable.id))
                    .where(
                        and(
                            inArray(courseBatchesTable.courseId, input.courseIds),
                            eq(batchesTable.isActive, "ACTIVE")
                        )
                    )
                    .orderBy(desc(batchesTable.graduationYear), batchesTable.section);

                logger.info(
                    {
                        userId: ctx.session.user.id,
                        courseIds: input.courseIds,
                        count: batches.length,
                    },
                    "Batches by courses retrieved"
                );

                return batches;
            } catch (error) {
                logger.error(
                    { error, userId: ctx.session.user.id, courseIds: input.courseIds },
                    "Error getting batches by courses"
                );
                throw error;
            }
        }),

    /**
     * Get students by batch IDs
     * Returns students enrolled in the specified batches
     */
    getStudentsByBatches: facultyAndManagerProcedure
        .input(
            z.object({
                batchIds: z.array(z.string().uuid()),
            })
        )
        .query(async ({ input, ctx }) => {
            try {
                if (input.batchIds.length === 0) {
                    return [];
                }

                // Get students from the specified batches
                const students = await db
                    .select({
                        id: usersTable.id,
                        name: usersTable.name,
                        email: usersTable.email,
                        profileId: usersTable.profileId,
                        batchId: batchStudentsTable.batchId,
                    })
                    .from(batchStudentsTable)
                    .innerJoin(usersTable, eq(batchStudentsTable.studentId, usersTable.id))
                    .where(inArray(batchStudentsTable.batchId, input.batchIds))
                    .orderBy(usersTable.name);

                logger.info(
                    {
                        userId: ctx.session.user.id,
                        batchIds: input.batchIds,
                        count: students.length,
                    },
                    "Students by batches retrieved"
                );

                return students;
            } catch (error) {
                logger.error(
                    { error, userId: ctx.session.user.id, batchIds: input.batchIds },
                    "Error getting students by batches"
                );
                throw error;
            }
        }),

    /**
     * Get students for quiz assignment
     * Returns students enrolled in selected courses (via batches or direct enrollment)
     * excluding those in specified batch IDs
     */
    getStudentsForQuizAssignment: facultyAndManagerProcedure
        .input(
            z.object({
                courseIds: z.array(z.uuid()),
                excludeBatchIds: z.array(z.uuid()).optional().default([]),
            })
        )
        .query(async ({ input, ctx }) => {
            try {
                if (input.courseIds.length === 0) {
                    return [];
                }

                // Get batches for the selected courses
                const courseBatches = await db
                    .select({
                        batchId: courseBatchesTable.batchId,
                    })
                    .from(courseBatchesTable)
                    .where(inArray(courseBatchesTable.courseId, input.courseIds));

                const allBatchIds = courseBatches.map((cb) => cb.batchId);

                // Get students from batches (excluding specified batches)
                const batchIdsToInclude =
                    input.excludeBatchIds.length > 0
                        ? allBatchIds.filter((id) => !input.excludeBatchIds.includes(id))
                        : allBatchIds;

                const studentsFromBatches =
                    batchIdsToInclude.length > 0
                        ? await db
                              .select({
                                  id: usersTable.id,
                                  name: usersTable.name,
                                  email: usersTable.email,
                                  profileId: usersTable.profileId,
                              })
                              .from(batchStudentsTable)
                              .innerJoin(
                                  usersTable,
                                  eq(batchStudentsTable.studentId, usersTable.id)
                              )
                              .where(inArray(batchStudentsTable.batchId, batchIdsToInclude))
                        : [];

                // Get students directly enrolled in courses
                const directStudents = await db
                    .select({
                        id: usersTable.id,
                        name: usersTable.name,
                        email: usersTable.email,
                        profileId: usersTable.profileId,
                    })
                    .from(courseStudentsTable)
                    .innerJoin(usersTable, eq(courseStudentsTable.studentId, usersTable.id))
                    .where(inArray(courseStudentsTable.courseId, input.courseIds));

                // If there are batches to exclude, filter out direct students who are in those batches
                let filteredDirectStudents = directStudents;
                if (input.excludeBatchIds.length > 0) {
                    const studentsInExcludedBatches = await db
                        .select({
                            studentId: batchStudentsTable.studentId,
                        })
                        .from(batchStudentsTable)
                        .where(inArray(batchStudentsTable.batchId, input.excludeBatchIds));

                    const excludedStudentIds = new Set(
                        studentsInExcludedBatches.map((s) => s.studentId)
                    );
                    filteredDirectStudents = directStudents.filter(
                        (s) => !excludedStudentIds.has(s.id)
                    );
                }

                // Deduplicate by student ID
                const studentMap = new Map<string, (typeof studentsFromBatches)[number]>();
                [...studentsFromBatches, ...filteredDirectStudents].forEach((student) => {
                    if (!studentMap.has(student.id)) {
                        studentMap.set(student.id, student);
                    }
                });

                const students = Array.from(studentMap.values()).sort((a, b) =>
                    a.name.localeCompare(b.name)
                );

                logger.info(
                    {
                        userId: ctx.session.user.id,
                        courseIds: input.courseIds,
                        excludeBatchIds: input.excludeBatchIds,
                        count: students.length,
                    },
                    "Students for quiz assignment retrieved"
                );

                return students;
            } catch (error) {
                logger.error(
                    {
                        error,
                        userId: ctx.session.user.id,
                        courseIds: input.courseIds,
                        excludeBatchIds: input.excludeBatchIds,
                    },
                    "Error getting students for quiz assignment"
                );
                throw error;
            }
        }),
});
