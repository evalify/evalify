import { z } from "zod";
import { createTRPCRouter, facultyAndManagerProcedure, protectedProcedure } from "../../../trpc";
import { db } from "@/db";
import {
    banksTable,
    bankUsersTable,
    usersTable,
    topicsTable,
    bankQuestionsTable,
} from "@/db/schema";
import { eq, and, or, ilike, desc, count, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

export const bankRouter = createTRPCRouter({
    list: facultyAndManagerProcedure
        .input(
            z.object({
                searchTerm: z.string().optional(),
                semester: z.number().optional(),
                limit: z.number().min(1).max(100).default(50),
                offset: z.number().min(0).default(0),
                sortBy: z.string().optional(),
                sortOrder: z.enum(["asc", "desc"]).optional(),
            })
        )
        .query(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;
                const conditions = [];

                if (input.searchTerm) {
                    const searchConditions = or(
                        ilike(banksTable.name, `%${input.searchTerm}%`),
                        ilike(banksTable.courseCode, `%${input.searchTerm}%`)
                    );
                    if (searchConditions) {
                        conditions.push(searchConditions);
                    }
                }

                if (input.semester !== undefined) {
                    conditions.push(eq(banksTable.semester, input.semester));
                }

                const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

                const banksQuery = db
                    .select({
                        id: banksTable.id,
                        name: banksTable.name,
                        courseCode: banksTable.courseCode,
                        semester: banksTable.semester,
                        createdAt: banksTable.created_at,
                        updatedAt: banksTable.updated_at,
                        createdById: banksTable.createdById,
                        creatorName: usersTable.name,
                        creatorEmail: usersTable.email,
                        accessLevel: bankUsersTable.accessLevel,
                    })
                    .from(banksTable)
                    .leftJoin(usersTable, eq(banksTable.createdById, usersTable.id))
                    .leftJoin(
                        bankUsersTable,
                        and(
                            eq(bankUsersTable.bankId, banksTable.id),
                            eq(bankUsersTable.userId, userId)
                        )
                    )
                    .where(
                        and(
                            whereClause,
                            or(
                                eq(banksTable.createdById, userId),
                                eq(bankUsersTable.userId, userId)
                            )
                        )
                    )
                    .orderBy(desc(banksTable.created_at))
                    .limit(input.limit)
                    .offset(input.offset);

                const [banks, [{ total }]] = await Promise.all([
                    banksQuery,
                    db
                        .select({ total: count() })
                        .from(banksTable)
                        .leftJoin(
                            bankUsersTable,
                            and(
                                eq(bankUsersTable.bankId, banksTable.id),
                                eq(bankUsersTable.userId, userId)
                            )
                        )
                        .where(
                            and(
                                whereClause,
                                or(
                                    eq(banksTable.createdById, userId),
                                    eq(bankUsersTable.userId, userId)
                                )
                            )
                        ),
                ]);

                const banksWithCounts = await Promise.all(
                    banks.map(async (bank) => {
                        const [[{ sharedCount }], [{ questionCount }], [{ topicCount }]] =
                            await Promise.all([
                                db
                                    .select({ sharedCount: count() })
                                    .from(bankUsersTable)
                                    .where(eq(bankUsersTable.bankId, bank.id)),
                                db
                                    .select({ questionCount: count() })
                                    .from(bankQuestionsTable)
                                    .where(eq(bankQuestionsTable.bankId, bank.id)),
                                db
                                    .select({ topicCount: count() })
                                    .from(topicsTable)
                                    .where(eq(topicsTable.bankId, bank.id)),
                            ]);

                        return {
                            id: bank.id,
                            name: bank.name,
                            courseCode: bank.courseCode,
                            semester: bank.semester,
                            createdAt: bank.createdAt,
                            updatedAt: bank.updatedAt,
                            creator: bank.createdById
                                ? {
                                      id: bank.createdById,
                                      name: bank.creatorName || "",
                                      email: bank.creatorEmail || "",
                                  }
                                : null,
                            accessLevel:
                                bank.createdById === userId
                                    ? ("OWNER" as const)
                                    : bank.accessLevel || "READ",
                            sharedCount: Number(sharedCount),
                            questionCount: Number(questionCount),
                            topicCount: Number(topicCount),
                        };
                    })
                );

                const totalCount = Number(total);
                const pageCount = Math.ceil(totalCount / input.limit);

                logger.info({ count: banks.length, userId }, "Banks listed");

                return {
                    rows: banksWithCounts,
                    pageCount,
                    total: totalCount,
                };
            } catch (error) {
                logger.error({ error }, "Error listing banks");
                throw error;
            }
        }),

    get: facultyAndManagerProcedure
        .input(
            z.object({
                id: z.string().uuid(),
            })
        )
        .query(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                const [bank] = await db
                    .select({
                        id: banksTable.id,
                        name: banksTable.name,
                        courseCode: banksTable.courseCode,
                        semester: banksTable.semester,
                        createdAt: banksTable.created_at,
                        updatedAt: banksTable.updated_at,
                        createdById: banksTable.createdById,
                        creatorName: usersTable.name,
                        creatorEmail: usersTable.email,
                    })
                    .from(banksTable)
                    .leftJoin(usersTable, eq(banksTable.createdById, usersTable.id))
                    .where(eq(banksTable.id, input.id))
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
                                    eq(bankUsersTable.bankId, bank.id),
                                    eq(bankUsersTable.userId, userId)
                                )
                            )
                            .limit(1)
                    ).length > 0;

                if (!hasAccess) {
                    throw new Error("You do not have access to this bank");
                }

                const accessLevel =
                    bank.createdById === userId
                        ? ("OWNER" as const)
                        : (
                              await db
                                  .select({ accessLevel: bankUsersTable.accessLevel })
                                  .from(bankUsersTable)
                                  .where(
                                      and(
                                          eq(bankUsersTable.bankId, bank.id),
                                          eq(bankUsersTable.userId, userId)
                                      )
                                  )
                                  .limit(1)
                          )[0]?.accessLevel || "READ";

                // Get bank topics
                const topics = await db
                    .select({
                        id: topicsTable.id,
                        name: topicsTable.name,
                    })
                    .from(topicsTable)
                    .where(eq(topicsTable.bankId, bank.id))
                    .orderBy(topicsTable.name);

                logger.info({ bankId: input.id, userId }, "Bank retrieved");

                return {
                    id: bank.id,
                    name: bank.name,
                    courseCode: bank.courseCode,
                    semester: bank.semester,
                    createdAt: bank.createdAt,
                    updatedAt: bank.updatedAt,
                    creator: bank.createdById
                        ? {
                              id: bank.createdById,
                              name: bank.creatorName || "",
                              email: bank.creatorEmail || "",
                          }
                        : null,
                    accessLevel,
                    topics: topics.map((t) => ({ id: t.id, name: t.name })),
                };
            } catch (error) {
                logger.error({ error, bankId: input.id }, "Error getting bank");
                throw error;
            }
        }),

    create: facultyAndManagerProcedure
        .input(
            z.object({
                name: z.string().min(1, "Bank name is required").max(255),
                courseCode: z.string().max(50).optional(),
                semester: z.number().min(1).max(8),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                const [bank] = await db
                    .insert(banksTable)
                    .values({
                        name: input.name,
                        courseCode: input.courseCode || null,
                        semester: input.semester,
                        createdById: userId,
                    })
                    .returning();

                logger.info(
                    {
                        bankId: bank.id,
                        name: input.name,
                        userId,
                    },
                    "Bank created"
                );

                return bank;
            } catch (error) {
                logger.error({ error, input }, "Error creating bank");
                throw new Error("Failed to create bank. Please try again.");
            }
        }),

    update: facultyAndManagerProcedure
        .input(
            z.object({
                id: z.string().uuid(),
                name: z.string().min(1, "Bank name is required").max(255).optional(),
                courseCode: z.string().max(50).optional(),
                semester: z.number().min(1).max(8).optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                const [existing] = await db
                    .select({ createdById: banksTable.createdById })
                    .from(banksTable)
                    .where(eq(banksTable.id, input.id))
                    .limit(1);

                if (!existing) {
                    throw new Error("Bank not found");
                }

                const [accessRecord] = await db
                    .select({ accessLevel: bankUsersTable.accessLevel })
                    .from(bankUsersTable)
                    .where(
                        and(eq(bankUsersTable.bankId, input.id), eq(bankUsersTable.userId, userId))
                    )
                    .limit(1);

                const hasWriteAccess =
                    existing.createdById === userId || accessRecord?.accessLevel === "WRITE";

                if (!hasWriteAccess) {
                    throw new Error("You do not have permission to edit this bank");
                }

                const updateData: Partial<typeof banksTable.$inferInsert> = {};
                if (input.name !== undefined) updateData.name = input.name;
                if (input.courseCode !== undefined)
                    updateData.courseCode = input.courseCode || null;
                if (input.semester !== undefined) updateData.semester = input.semester;

                const [bank] = await db
                    .update(banksTable)
                    .set(updateData)
                    .where(eq(banksTable.id, input.id))
                    .returning();

                logger.info({ bankId: input.id, userId }, "Bank updated");

                return bank;
            } catch (error) {
                logger.error({ error, bankId: input.id }, "Error updating bank");
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error("Failed to update bank. Please try again.");
            }
        }),

    delete: facultyAndManagerProcedure
        .input(
            z.object({
                id: z.string().uuid(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                const [existing] = await db
                    .select({ createdById: banksTable.createdById })
                    .from(banksTable)
                    .where(eq(banksTable.id, input.id))
                    .limit(1);

                if (!existing) {
                    throw new Error("Bank not found");
                }

                if (existing.createdById !== userId) {
                    throw new Error("Only the bank owner can delete it");
                }

                await db.delete(banksTable).where(eq(banksTable.id, input.id));

                logger.info({ bankId: input.id, userId }, "Bank deleted");

                return { success: true, id: input.id };
            } catch (error) {
                logger.error({ error, bankId: input.id }, "Error deleting bank");
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error("Failed to delete bank. Please try again.");
            }
        }),

    shareBank: facultyAndManagerProcedure
        .input(
            z.object({
                bankId: z.string().uuid(),
                userIds: z.array(z.string().uuid()).min(1),
                accessLevel: z.enum(["READ", "WRITE"]),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

                const [bank] = await db
                    .select({ createdById: banksTable.createdById })
                    .from(banksTable)
                    .where(eq(banksTable.id, input.bankId))
                    .limit(1);

                if (!bank) {
                    throw new Error("Bank not found");
                }

                if (bank.createdById !== userId) {
                    throw new Error("Only the bank owner can share it");
                }

                const values = input.userIds.map((targetUserId) => ({
                    bankId: input.bankId,
                    userId: targetUserId,
                    accessLevel: input.accessLevel,
                }));

                await db.insert(bankUsersTable).values(values).onConflictDoNothing();

                logger.info(
                    {
                        bankId: input.bankId,
                        userIds: input.userIds,
                        accessLevel: input.accessLevel,
                        userId,
                    },
                    "Bank shared"
                );

                return { success: true };
            } catch (error) {
                logger.error({ error, input }, "Error sharing bank");
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error("Failed to share bank. Please try again.");
            }
        }),

    unshareBank: facultyAndManagerProcedure
        .input(
            z.object({
                bankId: z.string().uuid(),
                userId: z.string().uuid(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const currentUserId = ctx.session.user.id;

                const [bank] = await db
                    .select({ createdById: banksTable.createdById })
                    .from(banksTable)
                    .where(eq(banksTable.id, input.bankId))
                    .limit(1);

                if (!bank) {
                    throw new Error("Bank not found");
                }

                if (bank.createdById !== currentUserId) {
                    throw new Error("Only the bank owner can unshare it");
                }

                await db
                    .delete(bankUsersTable)
                    .where(
                        and(
                            eq(bankUsersTable.bankId, input.bankId),
                            eq(bankUsersTable.userId, input.userId)
                        )
                    );

                logger.info(
                    {
                        bankId: input.bankId,
                        targetUserId: input.userId,
                        currentUserId,
                    },
                    "Bank unshared"
                );

                return { success: true };
            } catch (error) {
                logger.error({ error, input }, "Error unsharing bank");
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error("Failed to unshare bank. Please try again.");
            }
        }),

    updateAccessLevel: facultyAndManagerProcedure
        .input(
            z.object({
                bankId: z.string().uuid(),
                userId: z.string().uuid(),
                accessLevel: z.enum(["READ", "WRITE"]),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const currentUserId = ctx.session.user.id;

                const [bank] = await db
                    .select({ createdById: banksTable.createdById })
                    .from(banksTable)
                    .where(eq(banksTable.id, input.bankId))
                    .limit(1);

                if (!bank) {
                    throw new Error("Bank not found");
                }

                if (bank.createdById !== currentUserId) {
                    throw new Error("Only the bank owner can update access levels");
                }

                await db
                    .update(bankUsersTable)
                    .set({ accessLevel: input.accessLevel })
                    .where(
                        and(
                            eq(bankUsersTable.bankId, input.bankId),
                            eq(bankUsersTable.userId, input.userId)
                        )
                    );

                logger.info(
                    {
                        bankId: input.bankId,
                        targetUserId: input.userId,
                        accessLevel: input.accessLevel,
                        currentUserId,
                    },
                    "Bank access level updated"
                );

                return { success: true };
            } catch (error) {
                logger.error({ error, input }, "Error updating access level");
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error("Failed to update access level. Please try again.");
            }
        }),

    getSharedUsers: facultyAndManagerProcedure
        .input(
            z.object({
                bankId: z.string().uuid(),
            })
        )
        .query(async ({ input, ctx }) => {
            try {
                const userId = ctx.session.user.id;

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

                const sharedUsers = await db
                    .select({
                        id: bankUsersTable.id,
                        bankId: bankUsersTable.bankId,
                        userId: bankUsersTable.userId,
                        accessLevel: bankUsersTable.accessLevel,
                        createdAt: bankUsersTable.created_at,
                        updatedAt: bankUsersTable.updated_at,
                        userName: usersTable.name,
                        userEmail: usersTable.email,
                        userRole: usersTable.role,
                    })
                    .from(bankUsersTable)
                    .innerJoin(usersTable, eq(bankUsersTable.userId, usersTable.id))
                    .where(eq(bankUsersTable.bankId, input.bankId))
                    .orderBy(desc(bankUsersTable.created_at));

                logger.info(
                    { bankId: input.bankId, count: sharedUsers.length },
                    "Shared users retrieved"
                );

                return sharedUsers.map((su) => ({
                    id: su.id,
                    bankId: su.bankId,
                    userId: su.userId,
                    accessLevel: su.accessLevel,
                    createdAt: su.createdAt,
                    updatedAt: su.updatedAt,
                    user: {
                        id: su.userId,
                        name: su.userName,
                        email: su.userEmail,
                        role: su.userRole,
                    },
                }));
            } catch (error) {
                logger.error({ error, bankId: input.bankId }, "Error getting shared users");
                if (error instanceof Error) {
                    throw error;
                }
                throw error;
            }
        }),

    searchUsers: protectedProcedure
        .input(
            z.object({
                searchTerm: z.string().min(2),
                excludeUserIds: z.array(z.string().uuid()).optional(),
            })
        )
        .query(async ({ input }) => {
            try {
                const conditions = [
                    or(eq(usersTable.role, "MANAGER"), eq(usersTable.role, "FACULTY")),
                    eq(usersTable.status, "ACTIVE"),
                ];

                if (input.searchTerm) {
                    const searchConditions = or(
                        ilike(usersTable.name, `%${input.searchTerm}%`),
                        ilike(usersTable.email, `%${input.searchTerm}%`)
                    );
                    if (searchConditions) {
                        conditions.push(searchConditions);
                    }
                }

                if (input.excludeUserIds && input.excludeUserIds.length > 0) {
                    conditions.push(sql`${usersTable.id} NOT IN ${input.excludeUserIds}`);
                }

                const users = await db
                    .select({
                        id: usersTable.id,
                        name: usersTable.name,
                        email: usersTable.email,
                        role: usersTable.role,
                    })
                    .from(usersTable)
                    .where(and(...conditions))
                    .orderBy(usersTable.name)
                    .limit(50);

                return users;
            } catch (error) {
                logger.error({ error, searchTerm: input.searchTerm }, "Error searching users");
                throw error;
            }
        }),
});
