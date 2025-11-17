import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../../trpc";
import { db } from "@/db";
import {
    coursesTable,
    courseStudentsTable,
    courseInstructorsTable,
    courseBatchesTable,
    semestersTable,
    usersTable,
    batchesTable,
    batchStudentsTable,
    departmentsTable,
} from "@/db/schema";
import { eq, and, or, ilike, desc, count, notInArray } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Course management router - ADMIN ONLY
 * Handles all CRUD operations for courses and course associations
 */
export const courseRouter = createTRPCRouter({
    /**
     * List courses with optional filtering
     */
    list: adminProcedure
        .input(
            z.object({
                searchTerm: z.string().optional(),
                semesterId: z.uuid().optional(),
                type: z.enum(["CORE", "ELECTIVE", "MICRO_CREDENTIAL"]).optional(),
                isActive: z.enum(["ACTIVE", "INACTIVE"]).optional(),
                limit: z.number().min(1).max(100).default(50),
                offset: z.number().min(0).default(0),
            })
        )
        .query(async ({ input }) => {
            try {
                const conditions = [];

                if (input.searchTerm) {
                    const searchConditions = or(
                        ilike(coursesTable.name, `%${input.searchTerm}%`),
                        ilike(coursesTable.code, `%${input.searchTerm}%`),
                        ilike(coursesTable.description, `%${input.searchTerm}%`)
                    );
                    if (searchConditions) {
                        conditions.push(searchConditions);
                    }
                }

                if (input.semesterId) {
                    conditions.push(eq(coursesTable.semesterId, input.semesterId));
                }

                if (input.type) {
                    conditions.push(eq(coursesTable.type, input.type));
                }

                if (input.isActive) {
                    conditions.push(eq(coursesTable.isActive, input.isActive));
                }

                const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

                const [courses, [{ total }]] = await Promise.all([
                    db
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
                        .where(whereClause)
                        .orderBy(desc(coursesTable.created_at))
                        .limit(input.limit)
                        .offset(input.offset),
                    db.select({ total: count() }).from(coursesTable).where(whereClause),
                ]);

                logger.info({ count: courses.length }, "Courses listed");

                return {
                    courses,
                    total: Number(total),
                };
            } catch (error) {
                logger.error({ error }, "Error listing courses");
                throw error;
            }
        }),

    /**
     * Get a single course by ID with semester info
     */
    get: adminProcedure
        .input(
            z.object({
                id: z.uuid(),
            })
        )
        .query(async ({ input }) => {
            try {
                const course = await db
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
                    .where(eq(coursesTable.id, input.id))
                    .limit(1);

                if (!course[0]) {
                    throw new Error("Course not found");
                }

                logger.info({ courseId: input.id }, "Course retrieved");
                return course[0];
            } catch (error) {
                logger.error({ error, courseId: input.id }, "Error getting course");
                throw error;
            }
        }),

    /**
     * Create a new course
     */
    create: adminProcedure
        .input(
            z.object({
                name: z.string().min(1, "Course name is required").max(255),
                description: z.string().optional(),
                code: z.string().min(1, "Course code is required").max(50),
                image: z.string().max(512).optional(),
                type: z.enum(["CORE", "ELECTIVE", "MICRO_CREDENTIAL"]),
                semesterId: z.uuid(),
                isActive: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Validate semester exists
                const semester = await db
                    .select({ id: semestersTable.id })
                    .from(semestersTable)
                    .where(eq(semestersTable.id, input.semesterId))
                    .limit(1);

                if (!semester[0]) {
                    throw new Error(
                        "The selected semester does not exist. Please choose a valid semester."
                    );
                }

                const [course] = await db
                    .insert(coursesTable)
                    .values({
                        name: input.name,
                        description: input.description,
                        code: input.code,
                        image: input.image,
                        type: input.type,
                        semesterId: input.semesterId,
                        isActive: input.isActive,
                    })
                    .returning();

                logger.info(
                    {
                        courseId: course.id,
                        name: input.name,
                        code: input.code,
                        userId: ctx.session.user.id,
                    },
                    "Course created"
                );

                return course;
            } catch (error: unknown) {
                logger.error({ error, input }, "Error creating course");

                if (
                    error &&
                    typeof error === "object" &&
                    "code" in error &&
                    (error.code === "23505" ||
                        ("message" in error &&
                            typeof error.message === "string" &&
                            error.message.includes("unique")))
                ) {
                    throw new Error(
                        "A course with this code already exists. Please use a different code."
                    );
                }

                if (
                    error &&
                    typeof error === "object" &&
                    "message" in error &&
                    typeof error.message === "string"
                ) {
                    throw new Error(error.message);
                }

                throw new Error("Failed to create course. Please check your input and try again.");
            }
        }),

    /**
     * Update an existing course
     */
    update: adminProcedure
        .input(
            z.object({
                id: z.uuid(),
                name: z.string().min(1, "Course name is required").max(255).optional(),
                description: z.string().min(1, "Course description is required").optional(),
                code: z.string().min(1, "Course code is required").max(50).optional(),
                image: z.string().max(512).optional(),
                type: z.enum(["CORE", "ELECTIVE", "MICRO_CREDENTIAL"]).optional(),
                semesterId: z.uuid().optional(),
                isActive: z.enum(["ACTIVE", "INACTIVE"]).optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Validate semester exists if it's being updated
                if (input.semesterId !== undefined) {
                    const semester = await db
                        .select({ id: semestersTable.id })
                        .from(semestersTable)
                        .where(eq(semestersTable.id, input.semesterId))
                        .limit(1);

                    if (!semester[0]) {
                        throw new Error(
                            "The selected semester does not exist. Please choose a valid semester."
                        );
                    }
                }

                const updateData: Partial<typeof coursesTable.$inferInsert> = {};
                if (input.name !== undefined) updateData.name = input.name;
                if (input.description !== undefined) updateData.description = input.description;
                if (input.code !== undefined) updateData.code = input.code;
                if (input.image !== undefined) updateData.image = input.image;
                if (input.type !== undefined) updateData.type = input.type;
                if (input.semesterId !== undefined) updateData.semesterId = input.semesterId;
                if (input.isActive !== undefined) updateData.isActive = input.isActive;

                const [course] = await db
                    .update(coursesTable)
                    .set(updateData)
                    .where(eq(coursesTable.id, input.id))
                    .returning();

                if (!course) {
                    throw new Error("Course not found. It may have been deleted.");
                }

                logger.info({ courseId: input.id, userId: ctx.session.user.id }, "Course updated");

                return course;
            } catch (error: unknown) {
                logger.error({ error, courseId: input.id }, "Error updating course");

                if (
                    error &&
                    typeof error === "object" &&
                    "code" in error &&
                    (error.code === "23505" ||
                        ("message" in error &&
                            typeof error.message === "string" &&
                            error.message.includes("unique")))
                ) {
                    throw new Error(
                        "A course with this code already exists. Please use a different code."
                    );
                }

                if (
                    error &&
                    typeof error === "object" &&
                    "message" in error &&
                    typeof error.message === "string"
                ) {
                    throw new Error(error.message);
                }

                throw new Error("Failed to update course. Please check your input and try again.");
            }
        }),

    /**
     * Delete a course
     */
    delete: adminProcedure
        .input(
            z.object({
                id: z.uuid(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const [course] = await db
                    .delete(coursesTable)
                    .where(eq(coursesTable.id, input.id))
                    .returning();

                if (!course) {
                    throw new Error("Course not found. It may have already been deleted.");
                }

                logger.info({ courseId: input.id, userId: ctx.session.user.id }, "Course deleted");

                return { success: true, id: input.id };
            } catch (error: unknown) {
                logger.error({ error, courseId: input.id }, "Error deleting course");

                if (
                    error &&
                    typeof error === "object" &&
                    "code" in error &&
                    (error.code === "23503" ||
                        ("message" in error &&
                            typeof error.message === "string" &&
                            error.message.includes("foreign key")))
                ) {
                    throw new Error(
                        "Cannot delete course because it has associated students, instructors, or batches. Please remove those first."
                    );
                }

                if (
                    error &&
                    typeof error === "object" &&
                    "message" in error &&
                    typeof error.message === "string"
                ) {
                    throw new Error(error.message);
                }

                throw new Error("Failed to delete course. Please try again.");
            }
        }),

    /**
     * Get students enrolled in a course
     */
    getStudents: adminProcedure
        .input(
            z.object({
                courseId: z.uuid(),
            })
        )
        .query(async ({ input }) => {
            try {
                const students = await db
                    .select({
                        id: usersTable.id,
                        name: usersTable.name,
                        email: usersTable.email,
                        profileId: usersTable.profileId,
                        role: usersTable.role,
                        status: usersTable.status,
                        enrolledAt: courseStudentsTable.created_at,
                    })
                    .from(courseStudentsTable)
                    .innerJoin(usersTable, eq(courseStudentsTable.studentId, usersTable.id))
                    .where(eq(courseStudentsTable.courseId, input.courseId))
                    .orderBy(desc(courseStudentsTable.created_at));

                logger.info(
                    { courseId: input.courseId, count: students.length },
                    "Course students retrieved"
                );

                return students;
            } catch (error) {
                logger.error({ error, courseId: input.courseId }, "Error getting course students");
                throw error;
            }
        }),

    /**
     * Add a student to a course
     */
    addStudent: adminProcedure
        .input(
            z.object({
                courseId: z.uuid(),
                studentId: z.uuid(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if student exists and is a student
                const student = await db
                    .select({ id: usersTable.id, role: usersTable.role })
                    .from(usersTable)
                    .where(and(eq(usersTable.id, input.studentId), eq(usersTable.role, "STUDENT")))
                    .limit(1);

                if (!student[0]) {
                    throw new Error("Student not found or user is not a student.");
                }

                // Check if already enrolled
                const existing = await db
                    .select()
                    .from(courseStudentsTable)
                    .where(
                        and(
                            eq(courseStudentsTable.courseId, input.courseId),
                            eq(courseStudentsTable.studentId, input.studentId)
                        )
                    )
                    .limit(1);

                if (existing[0]) {
                    throw new Error("Student is already enrolled in this course.");
                }

                await db.insert(courseStudentsTable).values({
                    courseId: input.courseId,
                    studentId: input.studentId,
                });

                logger.info(
                    {
                        courseId: input.courseId,
                        studentId: input.studentId,
                        userId: ctx.session.user.id,
                    },
                    "Student added to course"
                );

                return { success: true };
            } catch (error: unknown) {
                logger.error({ error, input }, "Error adding student to course");

                if (
                    error &&
                    typeof error === "object" &&
                    "message" in error &&
                    typeof error.message === "string"
                ) {
                    throw new Error(error.message);
                }

                throw new Error("Failed to add student to course. Please try again.");
            }
        }),

    /**
     * Remove a student from a course
     */
    removeStudent: adminProcedure
        .input(
            z.object({
                courseId: z.uuid(),
                studentId: z.uuid(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const deleted = await db
                    .delete(courseStudentsTable)
                    .where(
                        and(
                            eq(courseStudentsTable.courseId, input.courseId),
                            eq(courseStudentsTable.studentId, input.studentId)
                        )
                    )
                    .returning();

                if (!deleted[0]) {
                    throw new Error("Student is not enrolled in this course.");
                }

                logger.info(
                    {
                        courseId: input.courseId,
                        studentId: input.studentId,
                        userId: ctx.session.user.id,
                    },
                    "Student removed from course"
                );

                return { success: true };
            } catch (error: unknown) {
                logger.error({ error, input }, "Error removing student from course");

                if (
                    error &&
                    typeof error === "object" &&
                    "message" in error &&
                    typeof error.message === "string"
                ) {
                    throw new Error(error.message);
                }

                throw new Error("Failed to remove student from course. Please try again.");
            }
        }),

    /**
     * Get instructors assigned to a course
     */
    getInstructors: adminProcedure
        .input(
            z.object({
                courseId: z.uuid(),
            })
        )
        .query(async ({ input }) => {
            try {
                const instructors = await db
                    .select({
                        id: usersTable.id,
                        name: usersTable.name,
                        email: usersTable.email,
                        profileId: usersTable.profileId,
                        role: usersTable.role,
                        status: usersTable.status,
                        assignedAt: courseInstructorsTable.created_at,
                    })
                    .from(courseInstructorsTable)
                    .innerJoin(usersTable, eq(courseInstructorsTable.instructorId, usersTable.id))
                    .where(eq(courseInstructorsTable.courseId, input.courseId))
                    .orderBy(desc(courseInstructorsTable.created_at));

                logger.info(
                    { courseId: input.courseId, count: instructors.length },
                    "Course instructors retrieved"
                );

                return instructors;
            } catch (error) {
                logger.error(
                    { error, courseId: input.courseId },
                    "Error getting course instructors"
                );
                throw error;
            }
        }),

    /**
     * Add an instructor to a course
     */
    addInstructor: adminProcedure
        .input(
            z.object({
                courseId: z.uuid(),
                instructorId: z.uuid(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if instructor exists and is faculty
                const instructor = await db
                    .select({ id: usersTable.id, role: usersTable.role })
                    .from(usersTable)
                    .where(
                        and(eq(usersTable.id, input.instructorId), eq(usersTable.role, "FACULTY"))
                    )
                    .limit(1);

                if (!instructor[0]) {
                    throw new Error("Instructor not found or user is not a faculty member.");
                }

                // Check if already assigned
                const existing = await db
                    .select()
                    .from(courseInstructorsTable)
                    .where(
                        and(
                            eq(courseInstructorsTable.courseId, input.courseId),
                            eq(courseInstructorsTable.instructorId, input.instructorId)
                        )
                    )
                    .limit(1);

                if (existing[0]) {
                    throw new Error("Instructor is already assigned to this course.");
                }

                await db.insert(courseInstructorsTable).values({
                    courseId: input.courseId,
                    instructorId: input.instructorId,
                });

                logger.info(
                    {
                        courseId: input.courseId,
                        instructorId: input.instructorId,
                        userId: ctx.session.user.id,
                    },
                    "Instructor added to course"
                );

                return { success: true };
            } catch (error: unknown) {
                logger.error({ error, input }, "Error adding instructor to course");

                if (
                    error &&
                    typeof error === "object" &&
                    "message" in error &&
                    typeof error.message === "string"
                ) {
                    throw new Error(error.message);
                }

                throw new Error("Failed to add instructor to course. Please try again.");
            }
        }),

    /**
     * Add an instructor to a course
     */
    addFacultyAndManagers: adminProcedure
        .input(
            z.object({
                courseId: z.uuid(),
                instructorId: z.uuid(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if instructor exists
                const instructor = await db
                    .select({ id: usersTable.id, role: usersTable.role })
                    .from(usersTable)
                    .where(eq(usersTable.id, input.instructorId))
                    .limit(1);

                if (!instructor[0]) {
                    throw new Error("Instructor not found ");
                }

                // Check if already assigned
                const existing = await db
                    .select()
                    .from(courseInstructorsTable)
                    .where(
                        and(
                            eq(courseInstructorsTable.courseId, input.courseId),
                            eq(courseInstructorsTable.instructorId, input.instructorId)
                        )
                    )
                    .limit(1);

                if (existing[0]) {
                    throw new Error("Instructor is already assigned to this course.");
                }

                await db.insert(courseInstructorsTable).values({
                    courseId: input.courseId,
                    instructorId: input.instructorId,
                });

                logger.info(
                    {
                        courseId: input.courseId,
                        instructorId: input.instructorId,
                        userId: ctx.session.user.id,
                    },
                    "Instructor added to course"
                );

                return { success: true };
            } catch (error: unknown) {
                logger.error({ error, input }, "Error adding instructor to course");

                if (
                    error &&
                    typeof error === "object" &&
                    "message" in error &&
                    typeof error.message === "string"
                ) {
                    throw new Error(error.message);
                }

                throw new Error("Failed to add instructor to course. Please try again.");
            }
        }),

    /**
     * Remove an instructor from a course
     */
    removeInstructor: adminProcedure
        .input(
            z.object({
                courseId: z.uuid(),
                instructorId: z.uuid(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const deleted = await db
                    .delete(courseInstructorsTable)
                    .where(
                        and(
                            eq(courseInstructorsTable.courseId, input.courseId),
                            eq(courseInstructorsTable.instructorId, input.instructorId)
                        )
                    )
                    .returning();

                if (!deleted[0]) {
                    throw new Error("Instructor is not assigned to this course.");
                }

                logger.info(
                    {
                        courseId: input.courseId,
                        instructorId: input.instructorId,
                        userId: ctx.session.user.id,
                    },
                    "Instructor removed from course"
                );

                return { success: true };
            } catch (error: unknown) {
                logger.error({ error, input }, "Error removing instructor from course");

                if (
                    error &&
                    typeof error === "object" &&
                    "message" in error &&
                    typeof error.message === "string"
                ) {
                    throw new Error(error.message);
                }

                throw new Error("Failed to remove instructor from course. Please try again.");
            }
        }),

    /**
     * Get batches assigned to a course
     */
    getBatches: adminProcedure
        .input(
            z.object({
                courseId: z.uuid(),
            })
        )
        .query(async ({ input }) => {
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
                        departmentName: departmentsTable.name,
                        assignedAt: courseBatchesTable.created_at,
                    })
                    .from(courseBatchesTable)
                    .innerJoin(batchesTable, eq(courseBatchesTable.batchId, batchesTable.id))
                    .leftJoin(departmentsTable, eq(batchesTable.departmentId, departmentsTable.id))
                    .where(eq(courseBatchesTable.courseId, input.courseId))
                    .orderBy(desc(courseBatchesTable.created_at));

                logger.info(
                    { courseId: input.courseId, count: batches.length },
                    "Course batches retrieved"
                );

                return batches;
            } catch (error) {
                logger.error({ error, courseId: input.courseId }, "Error getting course batches");
                throw error;
            }
        }),

    /**
     * Add a batch to a course
     */
    addBatch: adminProcedure
        .input(
            z.object({
                courseId: z.uuid(),
                batchId: z.uuid(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if batch exists
                const batch = await db
                    .select({ id: batchesTable.id })
                    .from(batchesTable)
                    .where(eq(batchesTable.id, input.batchId))
                    .limit(1);

                if (!batch[0]) {
                    throw new Error("Batch not found.");
                }

                // Check if already assigned
                const existing = await db
                    .select()
                    .from(courseBatchesTable)
                    .where(
                        and(
                            eq(courseBatchesTable.courseId, input.courseId),
                            eq(courseBatchesTable.batchId, input.batchId)
                        )
                    )
                    .limit(1);

                if (existing[0]) {
                    throw new Error("Batch is already assigned to this course.");
                }

                await db.insert(courseBatchesTable).values({
                    courseId: input.courseId,
                    batchId: input.batchId,
                });

                logger.info(
                    {
                        courseId: input.courseId,
                        batchId: input.batchId,
                        userId: ctx.session.user.id,
                    },
                    "Batch added to course"
                );

                return { success: true };
            } catch (error: unknown) {
                logger.error({ error, input }, "Error adding batch to course");

                if (
                    error &&
                    typeof error === "object" &&
                    "message" in error &&
                    typeof error.message === "string"
                ) {
                    throw new Error(error.message);
                }

                throw new Error("Failed to add batch to course. Please try again.");
            }
        }),

    /**
     * Remove a batch from a course
     */
    removeBatch: adminProcedure
        .input(
            z.object({
                courseId: z.uuid(),
                batchId: z.uuid(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const deleted = await db
                    .delete(courseBatchesTable)
                    .where(
                        and(
                            eq(courseBatchesTable.courseId, input.courseId),
                            eq(courseBatchesTable.batchId, input.batchId)
                        )
                    )
                    .returning();

                if (!deleted[0]) {
                    throw new Error("Batch is not assigned to this course.");
                }

                logger.info(
                    {
                        courseId: input.courseId,
                        batchId: input.batchId,
                        userId: ctx.session.user.id,
                    },
                    "Batch removed from course"
                );

                return { success: true };
            } catch (error: unknown) {
                logger.error({ error, input }, "Error removing batch from course");

                if (
                    error &&
                    typeof error === "object" &&
                    "message" in error &&
                    typeof error.message === "string"
                ) {
                    throw new Error(error.message);
                }

                throw new Error("Failed to remove batch from course. Please try again.");
            }
        }),

    /**
     * Get available faculty (not assigned to course)
     */
    getAvailableFaculty: adminProcedure
        .input(
            z.object({
                courseId: z.uuid(),
                searchTerm: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            try {
                // Get instructors already assigned
                const assignedInstructors = await db
                    .select({ instructorId: courseInstructorsTable.instructorId })
                    .from(courseInstructorsTable)
                    .where(eq(courseInstructorsTable.courseId, input.courseId));

                const assignedIds = assignedInstructors.map((i) => i.instructorId);

                const conditions = [
                    eq(usersTable.role, "FACULTY"),
                    eq(usersTable.status, "ACTIVE"),
                ];

                if (assignedIds.length > 0) {
                    conditions.push(notInArray(usersTable.id, assignedIds));
                }

                if (input.searchTerm) {
                    const searchConditions = or(
                        ilike(usersTable.name, `%${input.searchTerm}%`),
                        ilike(usersTable.email, `%${input.searchTerm}%`),
                        ilike(usersTable.profileId, `%${input.searchTerm}%`)
                    );
                    if (searchConditions) {
                        conditions.push(searchConditions);
                    }
                }

                const faculty = await db
                    .select({
                        id: usersTable.id,
                        name: usersTable.name,
                        email: usersTable.email,
                        profileId: usersTable.profileId,
                        role: usersTable.role,
                        status: usersTable.status,
                    })
                    .from(usersTable)
                    .where(and(...conditions))
                    .orderBy(usersTable.name)
                    .limit(50);

                return faculty;
            } catch (error) {
                logger.error(
                    { error, courseId: input.courseId },
                    "Error getting available faculty"
                );
                throw error;
            }
        }),

    /**
     * Get available faculty and Managers (not assigned to course)
     */
    getAvailableFacultyAndManagers: adminProcedure
        .input(
            z.object({
                courseId: z.uuid(),
                searchTerm: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            try {
                // Get instructors already assigned
                const assignedInstructors = await db
                    .select({ instructorId: courseInstructorsTable.instructorId })
                    .from(courseInstructorsTable)
                    .where(eq(courseInstructorsTable.courseId, input.courseId));

                const assignedIds = assignedInstructors.map((i) => i.instructorId);

                const conditions = [
                    or(eq(usersTable.role, "FACULTY"), eq(usersTable.role, "MANAGER")),
                    eq(usersTable.status, "ACTIVE"),
                ];

                if (assignedIds.length > 0) {
                    conditions.push(notInArray(usersTable.id, assignedIds));
                }

                if (input.searchTerm) {
                    const searchConditions = or(
                        ilike(usersTable.name, `%${input.searchTerm}%`),
                        ilike(usersTable.email, `%${input.searchTerm}%`),
                        ilike(usersTable.profileId, `%${input.searchTerm}%`)
                    );
                    if (searchConditions) {
                        conditions.push(searchConditions);
                    }
                }

                const facultyAndManagers = await db
                    .select({
                        id: usersTable.id,
                        name: usersTable.name,
                        email: usersTable.email,
                        profileId: usersTable.profileId,
                        role: usersTable.role,
                        status: usersTable.status,
                    })
                    .from(usersTable)
                    .where(and(...conditions))
                    .orderBy(usersTable.name)
                    .limit(50);

                return facultyAndManagers;
            } catch (error) {
                logger.error(
                    { error, courseId: input.courseId },
                    "Error getting available faculty and managers"
                );
                throw error;
            }
        }),

    /**
     * Get available students (not enrolled in course)
     * Excludes students who are:
     * 1. Directly enrolled in the course
     * 2. Part of batches assigned to the course
     */
    getAvailableStudents: adminProcedure
        .input(
            z.object({
                courseId: z.uuid(),
                searchTerm: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            try {
                // Get students already directly enrolled in the course
                const enrolledStudents = await db
                    .select({ studentId: courseStudentsTable.studentId })
                    .from(courseStudentsTable)
                    .where(eq(courseStudentsTable.courseId, input.courseId));

                const directlyEnrolledIds = enrolledStudents.map((s) => s.studentId);

                // Get students who are part of batches assigned to this course
                const batchStudents = await db
                    .select({ studentId: batchStudentsTable.studentId })
                    .from(batchStudentsTable)
                    .innerJoin(
                        courseBatchesTable,
                        eq(batchStudentsTable.batchId, courseBatchesTable.batchId)
                    )
                    .where(eq(courseBatchesTable.courseId, input.courseId));

                const batchEnrolledIds = batchStudents.map((s) => s.studentId);

                // Combine both lists of student IDs to exclude
                const allExcludedIds = [...new Set([...directlyEnrolledIds, ...batchEnrolledIds])];

                const conditions = [
                    eq(usersTable.role, "STUDENT"),
                    eq(usersTable.status, "ACTIVE"),
                ];

                if (allExcludedIds.length > 0) {
                    conditions.push(notInArray(usersTable.id, allExcludedIds));
                }

                if (input.searchTerm) {
                    const searchConditions = or(
                        ilike(usersTable.name, `%${input.searchTerm}%`),
                        ilike(usersTable.email, `%${input.searchTerm}%`),
                        ilike(usersTable.profileId, `%${input.searchTerm}%`)
                    );
                    if (searchConditions) {
                        conditions.push(searchConditions);
                    }
                }

                const students = await db
                    .select({
                        id: usersTable.id,
                        name: usersTable.name,
                        email: usersTable.email,
                        profileId: usersTable.profileId,
                        role: usersTable.role,
                        status: usersTable.status,
                    })
                    .from(usersTable)
                    .where(and(...conditions))
                    .orderBy(usersTable.name)
                    .limit(50);

                return students;
            } catch (error) {
                logger.error(
                    { error, courseId: input.courseId },
                    "Error getting available students"
                );
                throw error;
            }
        }),

    /**
     * Get available batches (not assigned to course)
     */
    getAvailableBatches: adminProcedure
        .input(
            z.object({
                courseId: z.uuid(),
                searchTerm: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            try {
                // Get batches already assigned
                const assignedBatches = await db
                    .select({ batchId: courseBatchesTable.batchId })
                    .from(courseBatchesTable)
                    .where(eq(courseBatchesTable.courseId, input.courseId));

                const assignedIds = assignedBatches.map((b) => b.batchId);

                const conditions = [eq(batchesTable.isActive, "ACTIVE")];

                if (assignedIds.length > 0) {
                    conditions.push(notInArray(batchesTable.id, assignedIds));
                }

                if (input.searchTerm) {
                    const searchConditions = or(
                        ilike(batchesTable.name, `%${input.searchTerm}%`),
                        ilike(batchesTable.section, `%${input.searchTerm}%`)
                    );
                    if (searchConditions) {
                        conditions.push(searchConditions);
                    }
                }

                const batches = await db
                    .select({
                        id: batchesTable.id,
                        name: batchesTable.name,
                        joinYear: batchesTable.joinYear,
                        graduationYear: batchesTable.graduationYear,
                        section: batchesTable.section,
                        departmentId: batchesTable.departmentId,
                        isActive: batchesTable.isActive,
                        departmentName: departmentsTable.name,
                    })
                    .from(batchesTable)
                    .leftJoin(departmentsTable, eq(batchesTable.departmentId, departmentsTable.id))
                    .where(and(...conditions))
                    .orderBy(batchesTable.name)
                    .limit(50);

                return batches;
            } catch (error) {
                logger.error(
                    { error, courseId: input.courseId },
                    "Error getting available batches"
                );
                throw error;
            }
        }),

    /**
     * Bulk create courses with instructors and batches
     * This is a transactional operation - all or nothing
     */
    bulkCreate: adminProcedure
        .input(
            z.object({
                courses: z.array(
                    z.object({
                        name: z.string().min(1).max(255),
                        code: z.string().min(1).max(50),
                        description: z.string().optional(),
                        type: z.enum(["CORE", "ELECTIVE", "MICRO_CREDENTIAL"]),
                        semesterId: z.uuid(),
                        instructorIds: z.array(z.uuid()).optional(),
                        batchIds: z.array(z.uuid()).optional(),
                        isActive: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
                    })
                ),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const createdCourses: Array<{ id: string; name: string; code: string }> = [];

                // Use a transaction to ensure all-or-nothing behavior
                await db.transaction(async (tx) => {
                    for (const courseData of input.courses) {
                        // Create the course
                        const [course] = await tx
                            .insert(coursesTable)
                            .values({
                                name: courseData.name,
                                code: courseData.code,
                                description: courseData.description || null,
                                type: courseData.type,
                                semesterId: courseData.semesterId,
                                isActive: courseData.isActive,
                                image: null,
                            })
                            .returning();

                        if (!course) {
                            throw new Error(`Failed to create course: ${courseData.name}`);
                        }

                        createdCourses.push({
                            id: course.id,
                            name: course.name,
                            code: course.code,
                        });

                        // Add instructors if provided
                        if (courseData.instructorIds && courseData.instructorIds.length > 0) {
                            const instructorValues = courseData.instructorIds.map(
                                (instructorId) => ({
                                    courseId: course.id,
                                    instructorId,
                                })
                            );

                            await tx
                                .insert(courseInstructorsTable)
                                .values(instructorValues)
                                .onConflictDoNothing();
                        }

                        // Add batches if provided
                        if (courseData.batchIds && courseData.batchIds.length > 0) {
                            const batchValues = courseData.batchIds.map((batchId) => ({
                                courseId: course.id,
                                batchId,
                            }));

                            await tx
                                .insert(courseBatchesTable)
                                .values(batchValues)
                                .onConflictDoNothing();
                        }
                    }
                });

                logger.info(
                    {
                        count: createdCourses.length,
                        userId: ctx.session.user.id,
                    },
                    "Courses bulk created"
                );

                return {
                    success: true,
                    count: createdCourses.length,
                    courses: createdCourses,
                };
            } catch (error: unknown) {
                logger.error({ error, input }, "Error bulk creating courses");

                if (
                    error &&
                    typeof error === "object" &&
                    "message" in error &&
                    typeof error.message === "string"
                ) {
                    throw new Error(error.message);
                }

                throw new Error("Failed to bulk create courses. Transaction rolled back.");
            }
        }),

    /**
     * Check if a course with exact same configuration already exists
     * Checks: semester + code + batches + instructors
     */
    checkDuplicates: adminProcedure
        .input(
            z.object({
                courses: z.array(
                    z.object({
                        semesterId: z.uuid(),
                        code: z.string(),
                        batchIds: z.array(z.uuid()).optional(),
                        instructorIds: z.array(z.uuid()).optional(),
                    })
                ),
            })
        )
        .query(async ({ input }) => {
            try {
                const duplicates: Array<{
                    semesterId: string;
                    code: string;
                    isDuplicate: boolean;
                    existingCourseName?: string;
                }> = [];

                for (const courseCheck of input.courses) {
                    // Find courses with matching semester and code
                    const matchingCourses = await db
                        .select({
                            id: coursesTable.id,
                            name: coursesTable.name,
                            code: coursesTable.code,
                        })
                        .from(coursesTable)
                        .where(
                            and(
                                eq(coursesTable.semesterId, courseCheck.semesterId),
                                eq(coursesTable.code, courseCheck.code)
                            )
                        );

                    let isExactDuplicate = false;
                    let existingCourseName: string | undefined;

                    // For each matching course, check if batches and instructors also match
                    for (const course of matchingCourses) {
                        // Get batches for this course
                        const courseBatches = await db
                            .select({ batchId: courseBatchesTable.batchId })
                            .from(courseBatchesTable)
                            .where(eq(courseBatchesTable.courseId, course.id));

                        const existingBatchIds = courseBatches.map((b) => b.batchId).sort();
                        const newBatchIds = (courseCheck.batchIds || []).sort();

                        // Get instructors for this course
                        const courseInstructors = await db
                            .select({ instructorId: courseInstructorsTable.instructorId })
                            .from(courseInstructorsTable)
                            .where(eq(courseInstructorsTable.courseId, course.id));

                        const existingInstructorIds = courseInstructors
                            .map((i) => i.instructorId)
                            .sort();
                        const newInstructorIds = (courseCheck.instructorIds || []).sort();

                        // Check if both arrays match exactly
                        const batchesMatch =
                            JSON.stringify(existingBatchIds) === JSON.stringify(newBatchIds);
                        const instructorsMatch =
                            JSON.stringify(existingInstructorIds) ===
                            JSON.stringify(newInstructorIds);

                        if (batchesMatch && instructorsMatch) {
                            isExactDuplicate = true;
                            existingCourseName = course.name;
                            break;
                        }
                    }

                    duplicates.push({
                        semesterId: courseCheck.semesterId,
                        code: courseCheck.code,
                        isDuplicate: isExactDuplicate,
                        existingCourseName,
                    });
                }

                return duplicates;
            } catch (error) {
                logger.error({ error }, "Error checking for duplicate courses");
                throw error;
            }
        }),
});
