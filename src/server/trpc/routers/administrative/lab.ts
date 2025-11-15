import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../../trpc";
import { db } from "@/db";
import { labsTable } from "@/db/schema";
import { eq, ilike, or, and, desc, count } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Lab management router - ADMIN ONLY
 * Handles all CRUD operations for labs
 */
export const labRouter = createTRPCRouter({
    /**
     * List all labs with optional filtering
     */
    list: adminProcedure
        .input(
            z.object({
                searchTerm: z.string().optional(),
                block: z.string().optional(),
                isActive: z.enum(["ACTIVE", "INACTIVE"]).optional(),
                page: z.number().min(1).default(1),
                limit: z.number().min(1).max(100).default(15),
            })
        )
        .query(async ({ input }) => {
            try {
                const conditions = [];
                const offset = (input.page - 1) * input.limit;

                if (input.searchTerm) {
                    const searchCondition = or(
                        ilike(labsTable.name, `%${input.searchTerm}%`),
                        ilike(labsTable.block, `%${input.searchTerm}%`),
                        ilike(labsTable.ipSubnet, `%${input.searchTerm}%`)
                    );
                    if (searchCondition) conditions.push(searchCondition);
                }

                if (input.block) {
                    conditions.push(eq(labsTable.block, input.block));
                }

                if (input.isActive) {
                    conditions.push(eq(labsTable.isActive, input.isActive));
                }

                const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

                const [labs, [{ total }]] = await Promise.all([
                    db
                        .select()
                        .from(labsTable)
                        .where(whereClause)
                        .orderBy(desc(labsTable.created_at))
                        .limit(input.limit)
                        .offset(offset),
                    db.select({ total: count() }).from(labsTable).where(whereClause),
                ]);

                logger.info({ count: labs.length, page: input.page }, "Labs listed");

                return {
                    labs,
                    total: Number(total),
                    hasMore: offset + labs.length < Number(total),
                };
            } catch (error) {
                logger.error({ error }, "Error listing labs");
                throw error;
            }
        }),

    /**
     * Get unique blocks for filtering
     */
    getUniqueBlocks: adminProcedure.query(async () => {
        try {
            const blocks = await db
                .selectDistinct({ block: labsTable.block })
                .from(labsTable)
                .orderBy(labsTable.block);

            const blockList = blocks.map((b) => b.block);

            logger.info({ count: blockList.length }, "Unique blocks retrieved");

            return blockList;
        } catch (error) {
            logger.error({ error }, "Error getting unique blocks");
            throw error;
        }
    }),

    /**
     * Get a single lab by ID
     */
    get: adminProcedure
        .input(
            z.object({
                id: z.uuid(),
            })
        )
        .query(async ({ input }) => {
            try {
                const lab = await db
                    .select()
                    .from(labsTable)
                    .where(eq(labsTable.id, input.id))
                    .limit(1);

                if (!lab[0]) {
                    throw new Error("Lab not found");
                }

                logger.info({ labId: input.id }, "Lab retrieved");
                return lab[0];
            } catch (error) {
                logger.error({ error, labId: input.id }, "Error getting lab");
                throw error;
            }
        }),

    /**
     * Create a new lab
     */
    create: adminProcedure
        .input(
            z.object({
                name: z.string().min(1).max(255),
                block: z.string().min(1).max(100),
                ipSubnet: z
                    .string()
                    .min(1)
                    .max(50)
                    .regex(/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/, {
                        message: "Invalid IP subnet format (e.g., 192.168.1.0/24)",
                    }),
                isActive: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const [lab] = await db
                    .insert(labsTable)
                    .values({
                        name: input.name,
                        block: input.block,
                        ipSubnet: input.ipSubnet,
                        isActive: input.isActive,
                    })
                    .returning();

                logger.info(
                    { labId: lab.id, name: input.name, userId: ctx.session.user.id },
                    "Lab created"
                );

                return lab;
            } catch (error) {
                logger.error({ error, name: input.name }, "Error creating lab");
                throw error;
            }
        }),

    /**
     * Update an existing lab
     */
    update: adminProcedure
        .input(
            z.object({
                id: z.uuid(),
                name: z.string().min(1).max(255).optional(),
                block: z.string().min(1).max(100).optional(),
                ipSubnet: z
                    .string()
                    .min(1)
                    .max(50)
                    .regex(/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/, {
                        message: "Invalid IP subnet format (e.g., 192.168.1.0/24)",
                    })
                    .optional(),
                isActive: z.enum(["ACTIVE", "INACTIVE"]).optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const updateData: Partial<typeof labsTable.$inferInsert> = {};
                if (input.name !== undefined) updateData.name = input.name;
                if (input.block !== undefined) updateData.block = input.block;
                if (input.ipSubnet !== undefined) updateData.ipSubnet = input.ipSubnet;
                if (input.isActive !== undefined) updateData.isActive = input.isActive;

                const [lab] = await db
                    .update(labsTable)
                    .set(updateData)
                    .where(eq(labsTable.id, input.id))
                    .returning();

                if (!lab) {
                    throw new Error("Lab not found");
                }

                logger.info({ labId: input.id, userId: ctx.session.user.id }, "Lab updated");

                return lab;
            } catch (error) {
                logger.error({ error, labId: input.id }, "Error updating lab");
                throw error;
            }
        }),

    /**
     * Delete a lab
     */
    delete: adminProcedure
        .input(
            z.object({
                id: z.uuid(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const [lab] = await db
                    .delete(labsTable)
                    .where(eq(labsTable.id, input.id))
                    .returning();

                if (!lab) {
                    throw new Error("Lab not found");
                }

                logger.info({ labId: input.id, userId: ctx.session.user.id }, "Lab deleted");

                return { success: true, id: input.id };
            } catch (error) {
                logger.error({ error, labId: input.id }, "Error deleting lab");
                throw error;
            }
        }),
});
