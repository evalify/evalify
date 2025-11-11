import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../../trpc";
import { db } from "@/db";
import { batchesTable, batchStudentsTable, usersTable, departmentsTable } from "@/db/schema";
import { eq, and, or, ilike, desc, count, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Batch management router - ADMIN ONLY
 * Handles all CRUD operations for batches and batch-student associations
 */
export const batchRouter = createTRPCRouter({
    /**
     * List all batches with optional filtering
     */
    list: adminProcedure
        .input(
            z.object({
                searchTerm: z.string().optional(),
                departmentId: z.uuid().optional(),
                isActive: z.enum(["ACTIVE", "INACTIVE"]).optional(),
                year: z.number().optional(),
                limit: z.number().min(1).max(100).default(50),
                offset: z.number().min(0).default(0),
            })
        )
        .query(async ({ input }) => {
            try {
                const conditions = [];

                if (input.searchTerm) {
                    const searchCondition = or(
                        ilike(batchesTable.name, `%${input.searchTerm}%`),
                        ilike(batchesTable.section, `%${input.searchTerm}%`)
                    );
                    if (searchCondition) conditions.push(searchCondition);
                }

                if (input.departmentId) {
                    conditions.push(eq(batchesTable.departmentId, input.departmentId));
                }

                if (input.isActive) {
                    conditions.push(eq(batchesTable.isActive, input.isActive));
                }

                if (input.year) {
                    const yearCondition = or(
                        eq(batchesTable.joinYear, input.year),
                        eq(batchesTable.graduationYear, input.year)
                    );
                    if (yearCondition) conditions.push(yearCondition);
                }

                const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

                const [batches, [{ total }]] = await Promise.all([
                    db
                        .select({
                            id: batchesTable.id,
                            name: batchesTable.name,
                            joinYear: batchesTable.joinYear,
                            graduationYear: batchesTable.graduationYear,
                            section: batchesTable.section,
                            departmentId: batchesTable.departmentId,
                            isActive: batchesTable.isActive,
                            createdAt: batchesTable.created_at,
                            updatedAt: batchesTable.updated_at,
                            departmentName: departmentsTable.name,
                        })
                        .from(batchesTable)
                        .leftJoin(
                            departmentsTable,
                            eq(batchesTable.departmentId, departmentsTable.id)
                        )
                        .where(whereClause)
                        .orderBy(desc(batchesTable.created_at))
                        .limit(input.limit)
                        .offset(input.offset),
                    db.select({ total: count() }).from(batchesTable).where(whereClause),
                ]);

                logger.info({ count: batches.length }, "Batches listed");

                return {
                    batches,
                    total: Number(total),
                };
            } catch (error) {
                logger.error({ error }, "Error listing batches");
                throw error;
            }
        }),

    /**
     * Get a single batch by ID with department info
     */
    get: adminProcedure
        .input(
            z.object({
                id: z.uuid(),
            })
        )
        .query(async ({ input }) => {
            try {
                const batch = await db
                    .select({
                        id: batchesTable.id,
                        name: batchesTable.name,
                        joinYear: batchesTable.joinYear,
                        graduationYear: batchesTable.graduationYear,
                        section: batchesTable.section,
                        departmentId: batchesTable.departmentId,
                        isActive: batchesTable.isActive,
                        createdAt: batchesTable.created_at,
                        updatedAt: batchesTable.updated_at,
                        departmentName: departmentsTable.name,
                    })
                    .from(batchesTable)
                    .leftJoin(departmentsTable, eq(batchesTable.departmentId, departmentsTable.id))
                    .where(eq(batchesTable.id, input.id))
                    .limit(1);

                if (!batch[0]) {
                    throw new Error("Batch not found");
                }

                logger.info({ batchId: input.id }, "Batch retrieved");
                return batch[0];
            } catch (error) {
                logger.error({ error, batchId: input.id }, "Error getting batch");
                throw error;
            }
        }),

    /**
     * Create a new batch
     */
    create: adminProcedure
        .input(
            z.object({
                name: z.string().min(1).max(40),
                joinYear: z.number().min(2000).max(2100),
                graduationYear: z.number().min(2000).max(2100),
                section: z.string().min(1).max(10),
                departmentId: z.uuid(),
                isActive: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const [batch] = await db
                    .insert(batchesTable)
                    .values({
                        name: input.name,
                        joinYear: input.joinYear,
                        graduationYear: input.graduationYear,
                        section: input.section,
                        departmentId: input.departmentId,
                        isActive: input.isActive,
                    })
                    .returning();

                logger.info(
                    { batchId: batch.id, name: input.name, userId: ctx.session.user.id },
                    "Batch created"
                );

                return batch;
            } catch (error) {
                logger.error({ error, input }, "Error creating batch");
                throw error;
            }
        }),

    /**
     * Update an existing batch
     */
    update: adminProcedure
        .input(
            z.object({
                id: z.uuid(),
                joinYear: z.number().min(2000).max(2100).optional(),
                graduationYear: z.number().min(2000).max(2100).optional(),
                section: z.string().min(1).max(10).optional(),
                departmentId: z.uuid().optional(),
                isActive: z.enum(["ACTIVE", "INACTIVE"]).optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const updateData: Partial<typeof batchesTable.$inferInsert> = {};
                if (input.joinYear !== undefined) updateData.joinYear = input.joinYear;
                if (input.graduationYear !== undefined)
                    updateData.graduationYear = input.graduationYear;
                if (input.section !== undefined) updateData.section = input.section;
                if (input.departmentId !== undefined) updateData.departmentId = input.departmentId;
                if (input.isActive !== undefined) updateData.isActive = input.isActive;

                // Update name if years changed
                if (input.joinYear !== undefined || input.graduationYear !== undefined) {
                    const currentBatch = await db
                        .select()
                        .from(batchesTable)
                        .where(eq(batchesTable.id, input.id))
                        .limit(1);

                    if (currentBatch[0]) {
                        const joinYear = input.joinYear ?? currentBatch[0].joinYear;
                        const gradYear = input.graduationYear ?? currentBatch[0].graduationYear;
                        updateData.name = `${joinYear}-${gradYear}`;
                    }
                }

                const [batch] = await db
                    .update(batchesTable)
                    .set(updateData)
                    .where(eq(batchesTable.id, input.id))
                    .returning();

                if (!batch) {
                    throw new Error("Batch not found");
                }

                logger.info({ batchId: input.id, userId: ctx.session.user.id }, "Batch updated");

                return batch;
            } catch (error) {
                logger.error({ error, batchId: input.id }, "Error updating batch");
                throw error;
            }
        }),

    /**
     * Delete a batch
     */
    delete: adminProcedure
        .input(
            z.object({
                id: z.uuid(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const [batch] = await db
                    .delete(batchesTable)
                    .where(eq(batchesTable.id, input.id))
                    .returning();

                if (!batch) {
                    throw new Error("Batch not found");
                }

                logger.info({ batchId: input.id, userId: ctx.session.user.id }, "Batch deleted");

                return { success: true, id: input.id };
            } catch (error) {
                logger.error({ error, batchId: input.id }, "Error deleting batch");
                throw error;
            }
        }),

    /**
     * Get students in a batch
     */
    getStudents: adminProcedure
        .input(
            z.object({
                batchId: z.uuid(),
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
                        profileImage: usersTable.profileImage,
                        phoneNumber: usersTable.phoneNumber,
                        status: usersTable.status,
                    })
                    .from(batchStudentsTable)
                    .innerJoin(usersTable, eq(batchStudentsTable.studentId, usersTable.id))
                    .where(eq(batchStudentsTable.batchId, input.batchId))
                    .orderBy(usersTable.name);

                logger.info(
                    { batchId: input.batchId, count: students.length },
                    "Batch students retrieved"
                );

                return students;
            } catch (error) {
                logger.error({ error, batchId: input.batchId }, "Error getting batch students");
                throw error;
            }
        }),

    /**
     * Add students to a batch
     */
    addStudents: adminProcedure
        .input(
            z.object({
                batchId: z.uuid(),
                studentIds: z.array(z.uuid()).min(1),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const values = input.studentIds.map((studentId) => ({
                    batchId: input.batchId,
                    studentId,
                }));

                await db.insert(batchStudentsTable).values(values).onConflictDoNothing();

                logger.info(
                    {
                        batchId: input.batchId,
                        studentCount: input.studentIds.length,
                        userId: ctx.session.user.id,
                    },
                    "Students added to batch"
                );

                return { success: true, added: input.studentIds.length };
            } catch (error) {
                logger.error({ error, batchId: input.batchId }, "Error adding students to batch");
                throw error;
            }
        }),

    /**
     * Remove students from a batch
     */
    removeStudents: adminProcedure
        .input(
            z.object({
                batchId: z.uuid(),
                studentIds: z.array(z.uuid()).min(1),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                await db
                    .delete(batchStudentsTable)
                    .where(
                        and(
                            eq(batchStudentsTable.batchId, input.batchId),
                            inArray(batchStudentsTable.studentId, input.studentIds)
                        )
                    );

                logger.info(
                    {
                        batchId: input.batchId,
                        studentCount: input.studentIds.length,
                        userId: ctx.session.user.id,
                    },
                    "Students removed from batch"
                );

                return { success: true, removed: input.studentIds.length };
            } catch (error) {
                logger.error(
                    { error, batchId: input.batchId },
                    "Error removing students from batch"
                );
                throw error;
            }
        }),

    /**
     * Get available students (not in the specified batch)
     */
    getAvailableStudents: adminProcedure
        .input(
            z.object({
                batchId: z.uuid(),
                searchTerm: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            try {
                // Get student IDs already in the batch
                const studentsInBatch = await db
                    .select({ studentId: batchStudentsTable.studentId })
                    .from(batchStudentsTable)
                    .where(eq(batchStudentsTable.batchId, input.batchId));

                const studentIdsInBatch = studentsInBatch.map((s) => s.studentId);

                const conditions = [eq(usersTable.role, "STUDENT")];

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

                const query = db
                    .select({
                        id: usersTable.id,
                        name: usersTable.name,
                        email: usersTable.email,
                        profileId: usersTable.profileId,
                        profileImage: usersTable.profileImage,
                        status: usersTable.status,
                    })
                    .from(usersTable)
                    .where(and(...conditions))
                    .orderBy(usersTable.name)
                    .limit(100);

                const allStudents = await query;

                // Filter out students already in batch
                const availableStudents = allStudents.filter(
                    (student) => !studentIdsInBatch.includes(student.id)
                );

                logger.info(
                    { batchId: input.batchId, count: availableStudents.length },
                    "Available students retrieved"
                );

                return availableStudents;
            } catch (error) {
                logger.error({ error, batchId: input.batchId }, "Error getting available students");
                throw error;
            }
        }),

    /**
     * Get all batches for validation (no pagination)
     * Used by bulk operations that need complete data
     */
    listAll: adminProcedure.query(async () => {
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
                    createdAt: batchesTable.created_at,
                    updatedAt: batchesTable.updated_at,
                    departmentName: departmentsTable.name,
                })
                .from(batchesTable)
                .leftJoin(departmentsTable, eq(batchesTable.departmentId, departmentsTable.id))
                .orderBy(desc(batchesTable.created_at));

            logger.info({ count: batches.length }, "All batches listed for validation");

            return batches;
        } catch (error) {
            logger.error({ error }, "Error listing all batches");
            throw error;
        }
    }),
});
