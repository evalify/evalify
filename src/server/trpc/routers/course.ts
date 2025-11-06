import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
    adminProcedure,
    facultyProcedure,
    createCustomProcedure,
} from "../trpc";
import { UserType } from "@/lib/auth/utils";
import { db } from "@/db";
import { coursesTable } from "@/db/schema/course/course";
import { eq } from "drizzle-orm";

/**
 * Course router - demonstrates role and group-based access
 */
export const courseRouter = createTRPCRouter({
    /**
     * Any authenticated user can list courses
     */
    list: protectedProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(10),
                offset: z.number().min(0).default(0),
            })
        )
        .query(async ({ input }) => {
            const courseList = await db
                .select()
                .from(coursesTable)
                .limit(input.limit)
                .offset(input.offset);

            return {
                courses: courseList,
                count: courseList.length,
            };
        }),

    /**
     * Any authenticated user can get course details
     */
    getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
        const course = await db
            .select()
            .from(coursesTable)
            .where(eq(coursesTable.id, parseInt(input.id)))
            .limit(1);

        return course[0] || null;
    }),

    /**
     * ADMIN or FACULTY - Create new course
     */
    create: createCustomProcedure([UserType.ADMIN, UserType.STAFF])
        .input(
            z.object({
                name: z.string().min(1),
                code: z.string().min(1),
                description: z.string().default(""),
                semesterId: z.number().int().positive(),
            })
        )
        .mutation(async ({ input }) => {
            const newCourse = await db
                .insert(coursesTable)
                .values({
                    name: input.name,
                    code: input.code,
                    description: input.description,
                    type: "CORE" as const,
                    semesterId: input.semesterId,
                })
                .returning();

            return newCourse[0];
        }),

    /**
     * ADMIN ONLY - Delete course
     */
    delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
        await db.delete(coursesTable).where(eq(coursesTable.id, parseInt(input.id)));
        return { success: true, courseId: input.id };
    }),

    /**
     * FACULTY ONLY - Update course
     * In real scenario, you'd check if faculty is assigned to this course
     */
    update: facultyProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().min(1).optional(),
                code: z.string().min(1).optional(),
            })
        )
        .mutation(async ({ input }) => {
            const { id, name, code } = input;
            const updateData: Record<string, unknown> = {};
            if (name) updateData.name = name;
            if (code) updateData.code = code;
            updateData.updatedAt = new Date();

            const updated = await db
                .update(coursesTable)
                .set(updateData)
                .where(eq(coursesTable.id, parseInt(id)))
                .returning();

            return updated[0];
        }),

    /**
     * Custom procedure - Only faculty from specific department group can access
     * Example: Only CS department faculty can manage CS courses
     */
    manageDepartmentCourses: createCustomProcedure(
        [UserType.STAFF],
        [] // You can add specific groups here, e.g., ['department-cs']
    )
        .input(
            z.object({
                departmentId: z.string(),
                action: z.enum(["list", "stats"]),
            })
        )
        .query(async ({ ctx, input }) => {
            // Check if user's groups match the department
            const userGroups = ctx.session.user.groups;
            const hasDepartmentAccess = userGroups.some((group) =>
                group.includes(`department-${input.departmentId}`)
            );

            if (!hasDepartmentAccess) {
                throw new Error("You don't have access to this department's courses");
            }

            const departmentCourses = await db.select().from(coursesTable).limit(50);

            return {
                courses: departmentCourses,
                count: departmentCourses.length,
                departmentId: input.departmentId,
            };
        }),
});
