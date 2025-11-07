import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../trpc";
import { db } from "@/db";
import { departmentsTable } from "@/db/schema";
import { eq, ilike, or, desc, count } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Department management router - ADMIN ONLY
 * Handles all CRUD operations for departments
 */
export const departmentRouter = createTRPCRouter({
    /**
     * List all departments with optional filtering
     */
    list: adminProcedure
        .input(
            z.object({
                searchTerm: z.string().optional(),
                isActive: z.enum(["ACTIVE", "INACTIVE"]).optional(),
                limit: z.number().min(1).max(100).default(50),
                offset: z.number().min(0).default(0),
            })
        )
        .query(async ({ input }) => {
            try {
                const conditions = [];

                if (input.searchTerm) {
                    conditions.push(ilike(departmentsTable.name, `%${input.searchTerm}%`));
                }

                if (input.isActive) {
                    conditions.push(eq(departmentsTable.isActive, input.isActive));
                }

                const whereClause = conditions.length > 0 ? or(...conditions) : undefined;

                const [departments, [{ total }]] = await Promise.all([
                    db
                        .select({
                            id: departmentsTable.id,
                            name: departmentsTable.name,
                            isActive: departmentsTable.isActive,
                            createdAt: departmentsTable.created_at,
                            updatedAt: departmentsTable.updated_at,
                        })
                        .from(departmentsTable)
                        .where(whereClause)
                        .orderBy(desc(departmentsTable.created_at))
                        .limit(input.limit)
                        .offset(input.offset),
                    db.select({ total: count() }).from(departmentsTable).where(whereClause),
                ]);

                logger.info({ count: departments.length }, "Departments listed");

                return {
                    departments,
                    total: Number(total),
                };
            } catch (error) {
                logger.error({ error }, "Error listing departments");
                throw error;
            }
        }),

    /**
     * Get a single department by ID
     */
    get: adminProcedure
        .input(
            z.object({
                id: z.uuid(),
            })
        )
        .query(async ({ input }) => {
            try {
                const department = await db
                    .select({
                        id: departmentsTable.id,
                        name: departmentsTable.name,
                        isActive: departmentsTable.isActive,
                        createdAt: departmentsTable.created_at,
                        updatedAt: departmentsTable.updated_at,
                    })
                    .from(departmentsTable)
                    .where(eq(departmentsTable.id, input.id))
                    .limit(1);

                if (!department[0]) {
                    throw new Error("Department not found");
                }

                logger.info({ departmentId: input.id }, "Department retrieved");
                return department[0];
            } catch (error) {
                logger.error({ error, departmentId: input.id }, "Error getting department");
                throw error;
            }
        }),

    /**
     * Create a new department
     */
    create: adminProcedure
        .input(
            z.object({
                name: z.string().min(1).max(255),
                isActive: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const [department] = await db
                    .insert(departmentsTable)
                    .values({
                        name: input.name,
                        isActive: input.isActive,
                    })
                    .returning();

                logger.info(
                    { departmentId: department.id, name: input.name, userId: ctx.session.user.id },
                    "Department created"
                );

                return department;
            } catch (error) {
                logger.error({ error, name: input.name }, "Error creating department");
                throw error;
            }
        }),

    /**
     * Update an existing department
     */
    update: adminProcedure
        .input(
            z.object({
                id: z.uuid(),
                name: z.string().min(1).max(255).optional(),
                isActive: z.enum(["ACTIVE", "INACTIVE"]).optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const updateData: Partial<typeof departmentsTable.$inferInsert> = {};
                if (input.name !== undefined) updateData.name = input.name;
                if (input.isActive !== undefined) updateData.isActive = input.isActive;

                const [department] = await db
                    .update(departmentsTable)
                    .set(updateData)
                    .where(eq(departmentsTable.id, input.id))
                    .returning();

                if (!department) {
                    throw new Error("Department not found");
                }

                logger.info(
                    { departmentId: input.id, userId: ctx.session.user.id },
                    "Department updated"
                );

                return department;
            } catch (error) {
                logger.error({ error, departmentId: input.id }, "Error updating department");
                throw error;
            }
        }),

    /**
     * Delete a department
     */
    delete: adminProcedure
        .input(
            z.object({
                id: z.uuid(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const [department] = await db
                    .delete(departmentsTable)
                    .where(eq(departmentsTable.id, input.id))
                    .returning();

                if (!department) {
                    throw new Error("Department not found");
                }

                logger.info(
                    { departmentId: input.id, userId: ctx.session.user.id },
                    "Department deleted"
                );

                return { success: true, id: input.id };
            } catch (error) {
                logger.error({ error, departmentId: input.id }, "Error deleting department");
                throw error;
            }
        }),
});
