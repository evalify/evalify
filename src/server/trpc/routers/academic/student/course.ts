import { z } from "zod";
import { createTRPCRouter, studentProcedure } from "../../../trpc";
import { db } from "@/db";
import {
    coursesTable,
    semestersTable,
    courseStudentsTable,
    courseBatchesTable,
    batchStudentsTable,
} from "@/db/schema";
import { eq, and, or, ilike, desc, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Student course router
 * Handles course listing for students
 */
export const studentCourseRouter = createTRPCRouter({
    /**
     * List courses for student
     * - Courses they are enrolled in directly
     * - Courses assigned to batches they belong to
     */
    list: studentProcedure
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

                // Get course IDs where student is directly enrolled
                const enrolledCourseIds = await db
                    .select({ courseId: courseStudentsTable.courseId })
                    .from(courseStudentsTable)
                    .where(eq(courseStudentsTable.studentId, userId));

                // Get batch IDs student belongs to
                const studentBatchIds = await db
                    .select({ batchId: batchStudentsTable.batchId })
                    .from(batchStudentsTable)
                    .where(eq(batchStudentsTable.studentId, userId));

                // Get course IDs from batch assignments
                const batchCourseIds =
                    studentBatchIds.length > 0
                        ? await db
                              .select({ courseId: courseBatchesTable.courseId })
                              .from(courseBatchesTable)
                              .where(
                                  inArray(
                                      courseBatchesTable.batchId,
                                      studentBatchIds.map((b) => b.batchId)
                                  )
                              )
                        : [];

                // Combine and deduplicate course IDs
                const allCourseIds = Array.from(
                    new Set([
                        ...enrolledCourseIds.map((c) => c.courseId),
                        ...batchCourseIds.map((c) => c.courseId),
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
                    "Student courses listed"
                );

                return {
                    courses,
                    total: totalResult.length,
                };
            } catch (error) {
                logger.error(
                    { error, userId: ctx.session.user.id },
                    "Error listing student courses"
                );
                throw error;
            }
        }),
});
