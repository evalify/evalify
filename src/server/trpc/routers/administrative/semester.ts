import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../../trpc";
import { db } from "@/db";
import { semestersTable, departmentsTable, semesterManagersTable, usersTable } from "@/db/schema";
import { eq, and, or, ilike, desc, count, notInArray } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Semester management router - ADMIN ONLY
 * Handles all CRUD operations for semesters
 */
export const semesterRouter = createTRPCRouter({
    /**
     * List all semesters with optional filtering
     */
    list: adminProcedure
        .input(
            z.object({
                searchTerm: z.string().optional(),
                departmentId: z.uuid().optional(),
                year: z.number().optional(),
                isActive: z.enum(["ACTIVE", "INACTIVE"]).optional(),
                limit: z.number().min(1).max(100).default(50),
                offset: z.number().min(0).default(0),
            })
        )
        .query(async ({ input }) => {
            try {
                const conditions = [];

                if (input.searchTerm) {
                    conditions.push(ilike(semestersTable.name, `%${input.searchTerm}%`));
                }

                if (input.departmentId) {
                    conditions.push(eq(semestersTable.departmentId, input.departmentId));
                }

                if (input.year) {
                    conditions.push(eq(semestersTable.year, input.year));
                }

                if (input.isActive) {
                    conditions.push(eq(semestersTable.isActive, input.isActive));
                }

                const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

                const [semesters, [{ total }]] = await Promise.all([
                    db
                        .select({
                            id: semestersTable.id,
                            name: semestersTable.name,
                            year: semestersTable.year,
                            departmentId: semestersTable.departmentId,
                            isActive: semestersTable.isActive,
                            createdAt: semestersTable.created_at,
                            updatedAt: semestersTable.updated_at,
                            departmentName: departmentsTable.name,
                        })
                        .from(semestersTable)
                        .leftJoin(
                            departmentsTable,
                            eq(semestersTable.departmentId, departmentsTable.id)
                        )
                        .where(whereClause)
                        .orderBy(desc(semestersTable.year), desc(semestersTable.created_at))
                        .limit(input.limit)
                        .offset(input.offset),
                    db.select({ total: count() }).from(semestersTable).where(whereClause),
                ]);

                logger.info({ count: semesters.length }, "Semesters listed");

                return {
                    semesters,
                    total: Number(total),
                };
            } catch (error) {
                logger.error({ error }, "Error listing semesters");
                throw error;
            }
        }),

    /**
     * Get a single semester by ID with department info
     */
    get: adminProcedure
        .input(
            z.object({
                id: z.uuid(),
            })
        )
        .query(async ({ input }) => {
            try {
                const semester = await db
                    .select({
                        id: semestersTable.id,
                        name: semestersTable.name,
                        year: semestersTable.year,
                        departmentId: semestersTable.departmentId,
                        isActive: semestersTable.isActive,
                        createdAt: semestersTable.created_at,
                        updatedAt: semestersTable.updated_at,
                        departmentName: departmentsTable.name,
                    })
                    .from(semestersTable)
                    .leftJoin(
                        departmentsTable,
                        eq(semestersTable.departmentId, departmentsTable.id)
                    )
                    .where(eq(semestersTable.id, input.id))
                    .limit(1);

                if (!semester[0]) {
                    throw new Error("Semester not found");
                }

                logger.info({ semesterId: input.id }, "Semester retrieved");
                return semester[0];
            } catch (error) {
                logger.error({ error, semesterId: input.id }, "Error getting semester");
                throw error;
            }
        }),

    /**
     * Create a new semester
     */
    create: adminProcedure
        .input(
            z.object({
                name: z.string().min(1, "Semester name is required").max(255),
                year: z
                    .number()
                    .min(2000, "Year must be after 2000")
                    .max(2100, "Year must be before 2100"),
                departmentId: z.uuid(),
                isActive: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Validate department exists
                const department = await db
                    .select({ id: departmentsTable.id })
                    .from(departmentsTable)
                    .where(eq(departmentsTable.id, input.departmentId))
                    .limit(1);

                if (!department[0]) {
                    throw new Error(
                        "The selected department does not exist. Please choose a valid department."
                    );
                }

                const [semester] = await db
                    .insert(semestersTable)
                    .values({
                        name: input.name,
                        year: input.year,
                        departmentId: input.departmentId,
                        isActive: input.isActive,
                    })
                    .returning();

                logger.info(
                    {
                        semesterId: semester.id,
                        name: input.name,
                        year: input.year,
                        userId: ctx.session.user.id,
                    },
                    "Semester created"
                );

                return semester;
            } catch (error: unknown) {
                logger.error({ error, input }, "Error creating semester");

                if (
                    error &&
                    typeof error === "object" &&
                    "message" in error &&
                    typeof error.message === "string"
                ) {
                    throw new Error(error.message);
                }

                throw new Error(
                    "Failed to create semester. Please check your input and try again."
                );
            }
        }),

    /**
     * Update an existing semester
     */
    update: adminProcedure
        .input(
            z.object({
                id: z.uuid(),
                name: z.string().min(1, "Semester name is required").max(255).optional(),
                year: z
                    .number()
                    .min(2000, "Year must be after 2000")
                    .max(2100, "Year must be before 2100")
                    .optional(),
                departmentId: z.uuid().optional(),
                isActive: z.enum(["ACTIVE", "INACTIVE"]).optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Validate department exists if it's being updated
                if (input.departmentId !== undefined) {
                    const department = await db
                        .select({ id: departmentsTable.id })
                        .from(departmentsTable)
                        .where(eq(departmentsTable.id, input.departmentId))
                        .limit(1);

                    if (!department[0]) {
                        throw new Error(
                            "The selected department does not exist. Please choose a valid department."
                        );
                    }
                }

                const updateData: Partial<typeof semestersTable.$inferInsert> = {};
                if (input.name !== undefined) updateData.name = input.name;
                if (input.year !== undefined) updateData.year = input.year;
                if (input.departmentId !== undefined) updateData.departmentId = input.departmentId;
                if (input.isActive !== undefined) updateData.isActive = input.isActive;

                const [semester] = await db
                    .update(semestersTable)
                    .set(updateData)
                    .where(eq(semestersTable.id, input.id))
                    .returning();

                if (!semester) {
                    throw new Error("Semester not found. It may have been deleted.");
                }

                logger.info(
                    { semesterId: input.id, userId: ctx.session.user.id },
                    "Semester updated"
                );

                return semester;
            } catch (error: unknown) {
                logger.error({ error, semesterId: input.id }, "Error updating semester");

                if (
                    error &&
                    typeof error === "object" &&
                    "message" in error &&
                    typeof error.message === "string"
                ) {
                    throw new Error(error.message);
                }

                throw new Error(
                    "Failed to update semester. Please check your input and try again."
                );
            }
        }),

    /**
     * Delete a semester
     */
    delete: adminProcedure
        .input(
            z.object({
                id: z.uuid(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const [semester] = await db
                    .delete(semestersTable)
                    .where(eq(semestersTable.id, input.id))
                    .returning();

                if (!semester) {
                    throw new Error("Semester not found. It may have already been deleted.");
                }

                logger.info(
                    { semesterId: input.id, userId: ctx.session.user.id },
                    "Semester deleted"
                );

                return { success: true, id: input.id };
            } catch (error: unknown) {
                logger.error({ error, semesterId: input.id }, "Error deleting semester");

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
                        "Cannot delete semester because it is associated with courses or other data. Please remove those first."
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

                throw new Error("Failed to delete semester. Please try again.");
            }
        }),

    /**
     * Get unique years for filtering
     */
    getUniqueYears: adminProcedure.query(async () => {
        try {
            const years = await db
                .selectDistinct({ year: semestersTable.year })
                .from(semestersTable)
                .orderBy(desc(semestersTable.year));

            return years.map((y) => y.year);
        } catch (error) {
            logger.error({ error }, "Error getting unique years");
            throw error;
        }
    }),

    /**
     * Get managers assigned to a semester
     */
    getManagers: adminProcedure
        .input(
            z.object({
                semesterId: z.uuid(),
            })
        )
        .query(async ({ input }) => {
            try {
                const managers = await db
                    .select({
                        id: usersTable.id,
                        name: usersTable.name,
                        email: usersTable.email,
                        profileId: usersTable.profileId,
                        role: usersTable.role,
                        status: usersTable.status,
                        assignedAt: semesterManagersTable.created_at,
                    })
                    .from(semesterManagersTable)
                    .innerJoin(usersTable, eq(semesterManagersTable.managerId, usersTable.id))
                    .where(eq(semesterManagersTable.semesterId, input.semesterId))
                    .orderBy(desc(semesterManagersTable.created_at));

                logger.info(
                    { semesterId: input.semesterId, count: managers.length },
                    "Semester managers retrieved"
                );

                return managers;
            } catch (error) {
                logger.error(
                    { error, semesterId: input.semesterId },
                    "Error getting semester managers"
                );
                throw error;
            }
        }),

    /**
     * Add a manager to a semester
     */
    addManager: adminProcedure
        .input(
            z.object({
                semesterId: z.uuid(),
                managerId: z.uuid(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if manager exists and is a manager
                const manager = await db
                    .select({ id: usersTable.id, role: usersTable.role })
                    .from(usersTable)
                    .where(and(eq(usersTable.id, input.managerId), eq(usersTable.role, "MANAGER")))
                    .limit(1);

                if (!manager[0]) {
                    throw new Error("Manager not found or user is not a manager.");
                }

                // Check if already assigned
                const existing = await db
                    .select()
                    .from(semesterManagersTable)
                    .where(
                        and(
                            eq(semesterManagersTable.semesterId, input.semesterId),
                            eq(semesterManagersTable.managerId, input.managerId)
                        )
                    )
                    .limit(1);

                if (existing[0]) {
                    throw new Error("Manager is already assigned to this semester.");
                }

                await db.insert(semesterManagersTable).values({
                    semesterId: input.semesterId,
                    managerId: input.managerId,
                });

                logger.info(
                    {
                        semesterId: input.semesterId,
                        managerId: input.managerId,
                        userId: ctx.session.user.id,
                    },
                    "Manager added to semester"
                );

                return { success: true };
            } catch (error: unknown) {
                logger.error({ error, input }, "Error adding manager to semester");

                if (
                    error &&
                    typeof error === "object" &&
                    "message" in error &&
                    typeof error.message === "string"
                ) {
                    throw new Error(error.message);
                }

                throw new Error("Failed to add manager to semester. Please try again.");
            }
        }),

    /**
     * Remove a manager from a semester
     */
    removeManager: adminProcedure
        .input(
            z.object({
                semesterId: z.uuid(),
                managerId: z.uuid(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const deleted = await db
                    .delete(semesterManagersTable)
                    .where(
                        and(
                            eq(semesterManagersTable.semesterId, input.semesterId),
                            eq(semesterManagersTable.managerId, input.managerId)
                        )
                    )
                    .returning();

                if (!deleted[0]) {
                    throw new Error("Manager is not assigned to this semester.");
                }

                logger.info(
                    {
                        semesterId: input.semesterId,
                        managerId: input.managerId,
                        userId: ctx.session.user.id,
                    },
                    "Manager removed from semester"
                );

                return { success: true };
            } catch (error: unknown) {
                logger.error({ error, input }, "Error removing manager from semester");

                if (
                    error &&
                    typeof error === "object" &&
                    "message" in error &&
                    typeof error.message === "string"
                ) {
                    throw new Error(error.message);
                }

                throw new Error("Failed to remove manager from semester. Please try again.");
            }
        }),

    /**
     * Get available managers (not assigned to semester)
     */
    getAvailableManagers: adminProcedure
        .input(
            z.object({
                semesterId: z.uuid(),
                searchTerm: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            try {
                // Get managers already assigned
                const assignedManagers = await db
                    .select({ managerId: semesterManagersTable.managerId })
                    .from(semesterManagersTable)
                    .where(eq(semesterManagersTable.semesterId, input.semesterId));

                const assignedIds = assignedManagers.map((m) => m.managerId);

                const conditions = [
                    eq(usersTable.role, "MANAGER"),
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

                const managers = await db
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

                return managers;
            } catch (error) {
                logger.error(
                    { error, semesterId: input.semesterId },
                    "Error getting available managers"
                );
                throw error;
            }
        }),

    /**
     * Bulk create semesters
     */
    bulkCreate: adminProcedure
        .input(
            z.object({
                semesters: z.array(
                    z.object({
                        name: z.string().min(1, "Semester name is required").max(255),
                        year: z
                            .number()
                            .min(2000, "Year must be after 2000")
                            .max(2100, "Year must be before 2100"),
                        departmentId: z.uuid(),
                        isActive: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
                    })
                ),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                if (input.semesters.length === 0) {
                    throw new Error("No semesters provided for creation");
                }

                // Validate all departments exist
                const departmentIds = [...new Set(input.semesters.map((s) => s.departmentId))];
                const departments = await db
                    .select({ id: departmentsTable.id })
                    .from(departmentsTable)
                    .where(or(...departmentIds.map((id) => eq(departmentsTable.id, id))));

                if (departments.length !== departmentIds.length) {
                    throw new Error("One or more selected departments do not exist");
                }

                // Check for duplicate semester names
                const semesterNames = input.semesters.map((s) => s.name);
                const uniqueNames = new Set(semesterNames);
                if (uniqueNames.size !== semesterNames.length) {
                    throw new Error("Duplicate semester names detected in the batch");
                }

                // Check if any semesters already exist
                const existingSemesters = await db
                    .select({ name: semestersTable.name })
                    .from(semestersTable)
                    .where(or(...semesterNames.map((name) => eq(semestersTable.name, name))));

                if (existingSemesters.length > 0) {
                    const existingNames = existingSemesters.map((s) => s.name).join(", ");
                    throw new Error(`The following semesters already exist: ${existingNames}`);
                }

                // Bulk insert all semesters
                const createdSemesters = await db
                    .insert(semestersTable)
                    .values(
                        input.semesters.map((sem) => ({
                            name: sem.name,
                            year: sem.year,
                            departmentId: sem.departmentId,
                            isActive: sem.isActive,
                        }))
                    )
                    .returning();

                logger.info(
                    {
                        count: createdSemesters.length,
                        userId: ctx.session.user.id,
                    },
                    "Semesters bulk created"
                );

                return {
                    success: true,
                    count: createdSemesters.length,
                    semesters: createdSemesters,
                };
            } catch (error: unknown) {
                logger.error({ error, input }, "Error bulk creating semesters");

                if (
                    error &&
                    typeof error === "object" &&
                    "message" in error &&
                    typeof error.message === "string"
                ) {
                    throw new Error(error.message);
                }

                throw new Error(
                    "Failed to bulk create semesters. Please check your input and try again."
                );
            }
        }),
});
