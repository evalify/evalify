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
import { eq } from "drizzle-orm";

/**
 * User management router - demonstrates different RBAC levels
 */
export const userRouter = createTRPCRouter({
    /**
     * ADMIN ONLY - List all users
     */
    listAll: adminProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(10),
                offset: z.number().min(0).default(0),
            })
        )
        .query(async ({ input }) => {
            const usersList = await db
                .select()
                .from(usersTable)
                .limit(input.limit)
                .offset(input.offset);

            return {
                users: usersList,
                count: usersList.length,
            };
        }),

    /**
     * ADMIN ONLY - Delete a user
     */
    delete: adminProcedure.input(z.object({ userId: z.string() })).mutation(async ({ input }) => {
        await db.delete(usersTable).where(eq(usersTable.id, parseInt(input.userId)));
        return { success: true, userId: input.userId };
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
            .where(eq(usersTable.id, parseInt(ctx.session.user.id)))
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
                email: z.string().email().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const updated = await db
                .update(usersTable)
                .set(input)
                .where(eq(usersTable.id, parseInt(ctx.session.user.id)))
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
