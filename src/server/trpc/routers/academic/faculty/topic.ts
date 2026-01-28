import { z } from "zod";
import { createTRPCRouter, createCustomProcedure } from "@/server/trpc/trpc";
import { UserType } from "@/lib/auth/utils";
import { db } from "@/db";
import { topicsTable, banksTable, bankUsersTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

const managerOrFacultyProcedure = createCustomProcedure([UserType.MANAGER, UserType.STAFF]);

/**
 * Topic management router for question banks
 * Handles CRUD operations for topics within a bank
 */
export const topicRouter = createTRPCRouter({
    /**
     * List all topics for a specific bank
     */
    listByBank: managerOrFacultyProcedure
        .input(
            z.object({
                bankId: z.uuid(),
            })
        )
        .query(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                // Verify user has access to the bank
                const [bank] = await db
                    .select({ createdById: banksTable.createdById })
                    .from(banksTable)
                    .where(eq(banksTable.id, input.bankId))
                    .limit(1);

                if (!bank) {
                    throw new Error("Bank not found");
                }

                const hasAccess =
                    bank.createdById === userId ||
                    (
                        await db
                            .select()
                            .from(bankUsersTable)
                            .where(
                                and(
                                    eq(bankUsersTable.bankId, input.bankId),
                                    eq(bankUsersTable.userId, userId)
                                )
                            )
                            .limit(1)
                    ).length > 0;

                if (!hasAccess) {
                    throw new Error("You do not have access to this bank");
                }

                // Fetch topics
                const topics = await db
                    .select({
                        id: topicsTable.id,
                        name: topicsTable.name,
                        createdAt: topicsTable.created_at,
                    })
                    .from(topicsTable)
                    .where(eq(topicsTable.bankId, input.bankId))
                    .orderBy(topicsTable.name);

                logger.info({ bankId: input.bankId, count: topics.length }, "Topics listed");

                return topics;
            } catch (error) {
                logger.error({ error, bankId: input.bankId }, "Error listing topics");
                throw error;
            }
        }),

    /**
     * Create a new topic for a bank
     */
    create: managerOrFacultyProcedure
        .input(
            z.object({
                bankId: z.uuid(),
                name: z.string().min(1, "Topic name is required").max(255),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                // Verify user has write access to the bank
                const [bank] = await db
                    .select({ createdById: banksTable.createdById })
                    .from(banksTable)
                    .where(eq(banksTable.id, input.bankId))
                    .limit(1);

                if (!bank) {
                    throw new Error("Bank not found");
                }

                const [accessRecord] = await db
                    .select({ accessLevel: bankUsersTable.accessLevel })
                    .from(bankUsersTable)
                    .where(
                        and(
                            eq(bankUsersTable.bankId, input.bankId),
                            eq(bankUsersTable.userId, userId)
                        )
                    )
                    .limit(1);

                const hasWriteAccess =
                    bank.createdById === userId || accessRecord?.accessLevel === "WRITE";

                if (!hasWriteAccess) {
                    throw new Error("You do not have write access to this bank");
                }

                // Check if a topic with the same name already exists in this bank
                const [existingTopic] = await db
                    .select({ id: topicsTable.id, name: topicsTable.name })
                    .from(topicsTable)
                    .where(
                        and(eq(topicsTable.bankId, input.bankId), eq(topicsTable.name, input.name))
                    )
                    .limit(1);

                if (existingTopic) {
                    throw new Error(
                        `A topic with the name "${input.name}" already exists in this bank. Please use a different name.`
                    );
                }

                // Create topic
                const [topic] = await db
                    .insert(topicsTable)
                    .values({
                        bankId: input.bankId,
                        name: input.name,
                    })
                    .returning();

                logger.info(
                    {
                        topicId: topic.id,
                        bankId: input.bankId,
                        name: input.name,
                        userId,
                    },
                    "Topic created"
                );

                return topic;
            } catch (error) {
                logger.error({ error, input }, "Error creating topic");
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error("Failed to create topic. Please try again.");
            }
        }),

    /**
     * Update a topic
     */
    update: managerOrFacultyProcedure
        .input(
            z.object({
                topicId: z.uuid(),
                name: z.string().min(1, "Topic name is required").max(255),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                // Get topic and verify access
                const [topic] = await db
                    .select({
                        id: topicsTable.id,
                        bankId: topicsTable.bankId,
                    })
                    .from(topicsTable)
                    .where(eq(topicsTable.id, input.topicId))
                    .limit(1);

                if (!topic) {
                    throw new Error("Topic not found");
                }

                const [bank] = await db
                    .select({ createdById: banksTable.createdById })
                    .from(banksTable)
                    .where(eq(banksTable.id, topic.bankId))
                    .limit(1);

                if (!bank) {
                    throw new Error("Bank not found");
                }

                const [accessRecord] = await db
                    .select({ accessLevel: bankUsersTable.accessLevel })
                    .from(bankUsersTable)
                    .where(
                        and(
                            eq(bankUsersTable.bankId, topic.bankId),
                            eq(bankUsersTable.userId, userId)
                        )
                    )
                    .limit(1);

                const hasWriteAccess =
                    bank.createdById === userId || accessRecord?.accessLevel === "WRITE";

                if (!hasWriteAccess) {
                    throw new Error("You do not have write access to this bank");
                }

                // Check if another topic with the same name already exists in this bank
                const [existingTopic] = await db
                    .select({ id: topicsTable.id, name: topicsTable.name })
                    .from(topicsTable)
                    .where(
                        and(eq(topicsTable.bankId, topic.bankId), eq(topicsTable.name, input.name))
                    )
                    .limit(1);

                if (existingTopic && existingTopic.id !== input.topicId) {
                    throw new Error(
                        `A topic with the name "${input.name}" already exists in this bank. Please use a different name.`
                    );
                }

                // Update topic
                const [updatedTopic] = await db
                    .update(topicsTable)
                    .set({ name: input.name })
                    .where(eq(topicsTable.id, input.topicId))
                    .returning();

                logger.info({ topicId: input.topicId, userId }, "Topic updated");

                return updatedTopic;
            } catch (error) {
                logger.error({ error, topicId: input.topicId }, "Error updating topic");
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error("Failed to update topic. Please try again.");
            }
        }),

    /**
     * Delete a topic
     */
    delete: managerOrFacultyProcedure
        .input(
            z.object({
                topicId: z.uuid(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                // Get topic and verify access
                const [topic] = await db
                    .select({
                        id: topicsTable.id,
                        bankId: topicsTable.bankId,
                    })
                    .from(topicsTable)
                    .where(eq(topicsTable.id, input.topicId))
                    .limit(1);

                if (!topic) {
                    throw new Error("Topic not found");
                }

                const [bank] = await db
                    .select({ createdById: banksTable.createdById })
                    .from(banksTable)
                    .where(eq(banksTable.id, topic.bankId))
                    .limit(1);

                if (!bank) {
                    throw new Error("Bank not found");
                }

                const [accessRecord] = await db
                    .select({ accessLevel: bankUsersTable.accessLevel })
                    .from(bankUsersTable)
                    .where(
                        and(
                            eq(bankUsersTable.bankId, topic.bankId),
                            eq(bankUsersTable.userId, userId)
                        )
                    )
                    .limit(1);

                const hasWriteAccess =
                    bank.createdById === userId || accessRecord?.accessLevel === "WRITE";

                if (!hasWriteAccess) {
                    throw new Error("You do not have write access to this bank");
                }

                // Delete topic
                await db.delete(topicsTable).where(eq(topicsTable.id, input.topicId));

                logger.info({ topicId: input.topicId, userId }, "Topic deleted");

                return { success: true, id: input.topicId };
            } catch (error) {
                logger.error({ error, topicId: input.topicId }, "Error deleting topic");
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error("Failed to delete topic. Please try again.");
            }
        }),
});
