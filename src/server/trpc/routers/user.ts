import { z } from "zod";
import {
    createTRPCRouter,
    adminProcedure,
    facultyProcedure,
    managerProcedure,
    studentProcedure,
    createCustomProcedure,
} from "../trpc";
import { UserType } from "@/lib/auth/utils";
import { db } from "@/db";
import { usersTable } from "@/db/schema/user/user";
import { eq, or, ilike, and, desc, count } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * User management router - demonstrates different RBAC levels
 */
export const userRouter = createTRPCRouter({
    /**
     * ADMIN ONLY - List all users with filtering and pagination
     */
    list: adminProcedure
        .input(
            z.object({
                searchTerm: z.string().optional(),
                role: z.enum(["ADMIN", "MANAGER", "FACULTY", "STUDENT"]).optional(),
                status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
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
                        ilike(usersTable.name, `%${input.searchTerm}%`),
                        ilike(usersTable.email, `%${input.searchTerm}%`),
                        ilike(usersTable.profileId, `%${input.searchTerm}%`)
                    );
                    if (searchCondition) conditions.push(searchCondition);
                }

                if (input.role) {
                    conditions.push(eq(usersTable.role, input.role));
                }

                if (input.status) {
                    conditions.push(eq(usersTable.status, input.status));
                }

                const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

                const [users, [{ total }]] = await Promise.all([
                    db
                        .select()
                        .from(usersTable)
                        .where(whereClause)
                        .orderBy(desc(usersTable.created_at))
                        .limit(input.limit)
                        .offset(offset),
                    db.select({ total: count() }).from(usersTable).where(whereClause),
                ]);

                logger.info({ count: users.length, page: input.page }, "Users listed");

                return {
                    users,
                    total: Number(total),
                };
            } catch (error) {
                logger.error({ error }, "Error listing users");
                throw error;
            }
        }),

    /**
     * ADMIN ONLY - Get a single user by ID
     */
    get: adminProcedure
        .input(
            z.object({
                id: z.uuid(),
            })
        )
        .query(async ({ input }) => {
            try {
                const user = await db
                    .select()
                    .from(usersTable)
                    .where(eq(usersTable.id, input.id))
                    .limit(1);

                if (!user[0]) {
                    throw new Error("User not found");
                }

                logger.info({ userId: input.id }, "User retrieved");
                return user[0];
            } catch (error) {
                logger.error({ error, userId: input.id }, "Error getting user");
                throw error;
            }
        }),

    /**
     * ADMIN ONLY - Create a new user
     */
    create: adminProcedure
        .input(
            z.object({
                name: z.string().min(1).max(255),
                email: z.email(),
                profileId: z.string().min(1).max(255),
                profileImage: z.string().max(512).optional(),
                role: z.enum(["ADMIN", "MANAGER", "FACULTY", "STUDENT"]),
                phoneNumber: z.string().max(20).optional(),
                status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if user with same email already exists
                const existingUserByEmail = await db
                    .select()
                    .from(usersTable)
                    .where(eq(usersTable.email, input.email.toLowerCase()))
                    .limit(1);

                if (existingUserByEmail.length > 0) {
                    logger.warn(
                        { email: input.email },
                        "Attempt to create user with existing email"
                    );
                    throw new Error(
                        `A user with email "${input.email}" already exists. Please use a different email address.`
                    );
                }

                // Check if user with same profile ID already exists
                const existingUserByProfileId = await db
                    .select()
                    .from(usersTable)
                    .where(eq(usersTable.profileId, input.profileId))
                    .limit(1);

                if (existingUserByProfileId.length > 0) {
                    logger.warn(
                        { profileId: input.profileId },
                        "Attempt to create user with existing profile ID"
                    );
                    throw new Error(
                        `A user with profile ID "${input.profileId}" already exists. Please use a different profile ID.`
                    );
                }

                const [user] = await db
                    .insert(usersTable)
                    .values({
                        name: input.name,
                        email: input.email.toLowerCase(),
                        profileId: input.profileId,
                        profileImage: input.profileImage,
                        role: input.role,
                        phoneNumber: input.phoneNumber,
                        status: input.status,
                    })
                    .returning();

                logger.info(
                    {
                        userId: user.id,
                        email: input.email,
                        role: input.role,
                        createdBy: ctx.session.user.id,
                    },
                    "User created"
                );

                return user;
            } catch (error) {
                logger.error({ error, email: input.email }, "Error creating user");
                throw error;
            }
        }),

    /**
     * ADMIN ONLY - Update a user
     */
    update: adminProcedure
        .input(
            z.object({
                id: z.uuid(),
                name: z.string().min(1).max(255).optional(),
                email: z.email().optional(),
                profileId: z.string().min(1).max(255).optional(),
                profileImage: z.string().max(512).optional(),
                role: z.enum(["ADMIN", "MANAGER", "FACULTY", "STUDENT"]).optional(),
                phoneNumber: z.string().max(20).optional(),
                status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Check if email is being updated and if it already exists for another user
                if (input.email) {
                    const existingUserByEmail = await db
                        .select()
                        .from(usersTable)
                        .where(eq(usersTable.email, input.email.toLowerCase()))
                        .limit(1);

                    if (existingUserByEmail.length > 0 && existingUserByEmail[0].id !== input.id) {
                        logger.warn(
                            { email: input.email, userId: input.id },
                            "Attempt to update user with existing email"
                        );
                        throw new Error(
                            `A user with email "${input.email}" already exists. Please use a different email address.`
                        );
                    }
                }

                // Check if profile ID is being updated and if it already exists for another user
                if (input.profileId) {
                    const existingUserByProfileId = await db
                        .select()
                        .from(usersTable)
                        .where(eq(usersTable.profileId, input.profileId))
                        .limit(1);

                    if (
                        existingUserByProfileId.length > 0 &&
                        existingUserByProfileId[0].id !== input.id
                    ) {
                        logger.warn(
                            { profileId: input.profileId, userId: input.id },
                            "Attempt to update user with existing profile ID"
                        );
                        throw new Error(
                            `A user with profile ID "${input.profileId}" already exists. Please use a different profile ID.`
                        );
                    }
                }

                const updateData: Partial<typeof usersTable.$inferInsert> = {};
                if (input.name !== undefined) updateData.name = input.name;
                if (input.email !== undefined) updateData.email = input.email.toLowerCase();
                if (input.profileId !== undefined) updateData.profileId = input.profileId;
                if (input.profileImage !== undefined) updateData.profileImage = input.profileImage;
                if (input.role !== undefined) updateData.role = input.role;
                if (input.phoneNumber !== undefined) updateData.phoneNumber = input.phoneNumber;
                if (input.status !== undefined) updateData.status = input.status;

                const [user] = await db
                    .update(usersTable)
                    .set(updateData)
                    .where(eq(usersTable.id, input.id))
                    .returning();

                if (!user) {
                    throw new Error("User not found");
                }

                logger.info({ userId: input.id, updatedBy: ctx.session.user.id }, "User updated");

                return user;
            } catch (error) {
                logger.error({ error, userId: input.id }, "Error updating user");
                throw error;
            }
        }),

    /**
     * ADMIN ONLY - Delete/Deactivate a user
     */
    delete: adminProcedure
        .input(
            z.object({
                id: z.uuid(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Instead of hard delete, we deactivate the user
                const [user] = await db
                    .update(usersTable)
                    .set({ status: "INACTIVE" })
                    .where(eq(usersTable.id, input.id))
                    .returning();

                if (!user) {
                    throw new Error("User not found");
                }

                logger.info(
                    { userId: input.id, deletedBy: ctx.session.user.id },
                    "User deactivated"
                );

                return { success: true, id: input.id };
            } catch (error) {
                logger.error({ error, userId: input.id }, "Error deleting user");
                throw error;
            }
        }),

    /**
     * FACULTY or MANAGER - Get students in their department/batch
     */
    getStudents: createCustomProcedure([UserType.STAFF, UserType.MANAGER])
        .input(
            z.object({
                departmentId: z.string().optional(),
                batchId: z.string().optional(),
            })
        )
        .query(async ({ ctx }) => {
            // Here you would filter based on the user's groups and input
            // This is a simplified example
            const studentList = await db
                .select()
                .from(usersTable)
                .where(eq(usersTable.role, "STUDENT"))
                .limit(50);

            return {
                students: studentList,
                requestedBy: ctx.session.user.id,
            };
        }),

    /**
     * STUDENT ONLY - Get own profile
     */
    getMyProfile: studentProcedure.query(async ({ ctx }) => {
        const user = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, ctx.session.user.id))
            .limit(1);

        return user[0] || null;
    }),

    /**
     * STUDENT ONLY - Update own profile
     */
    updateMyProfile: studentProcedure
        .input(
            z.object({
                name: z.string().min(1).optional(),
                email: z.email().optional(),
                phoneNumber: z.string().max(20).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const updated = await db
                .update(usersTable)
                .set(input)
                .where(eq(usersTable.id, ctx.session.user.id))
                .returning();

            return updated[0];
        }),

    /**
     * MANAGER ONLY - Manage batch assignments
     */
    assignBatch: managerProcedure
        .input(
            z.object({
                userId: z.string(),
                batchId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Implementation for batch assignment
            return {
                success: true,
                userId: input.userId,
                batchId: input.batchId,
                assignedBy: ctx.session.user.id,
            };
        }),

    /**
     * FACULTY ONLY - Grade students
     */
    gradeStudent: facultyProcedure
        .input(
            z.object({
                studentId: z.string(),
                courseId: z.string(),
                grade: z.number().min(0).max(100),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Implementation for grading
            return {
                success: true,
                studentId: input.studentId,
                courseId: input.courseId,
                grade: input.grade,
                gradedBy: ctx.session.user.id,
            };
        }),
});
