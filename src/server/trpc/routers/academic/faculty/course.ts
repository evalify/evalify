import { z } from "zod";
import { createTRPCRouter, facultyAndManagerProcedure } from "../../../trpc";
import { db } from "@/db";
import {
    coursesTable,
    courseInstructorsTable,
    courseStudentsTable,
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
});
