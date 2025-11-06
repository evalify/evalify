import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../trpc";
import { db } from "@/db";
import { semestersTable, departmentsTable } from "@/db/schema";
import { eq, and, ilike, desc, count } from "drizzle-orm";
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
                departmentId: z.number().optional(),
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
                id: z.number(),
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
                departmentId: z.number().min(1, "Please select a valid department"),
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
                id: z.number(),
                name: z.string().min(1, "Semester name is required").max(255).optional(),
                year: z
                    .number()
                    .min(2000, "Year must be after 2000")
                    .max(2100, "Year must be before 2100")
                    .optional(),
                departmentId: z.number().min(1, "Please select a valid department").optional(),
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
                id: z.number(),
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

            const yearList = years.map((y) => y.year);

            logger.info({ count: yearList.length }, "Unique years retrieved");

            return yearList;
        } catch (error) {
            logger.error({ error }, "Error getting unique years");
            throw error;
        }
    }),
});
