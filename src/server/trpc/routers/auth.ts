import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";

/**
 * Auth router - handles user authentication and session info
 */
export const authRouter = createTRPCRouter({
    /**
     * Get current session information
     * Public endpoint that returns session if available
     */
    getSession: publicProcedure.query(({ ctx }) => {
        return ctx.session;
    }),

    /**
     * Get current user information
     * Protected endpoint that requires authentication
     */
    getUser: protectedProcedure.query(({ ctx }) => {
        return {
            id: ctx.session.user.id,
            name: ctx.session.user.name,
            email: ctx.session.user.email,
            roles: ctx.session.user.roles,
            groups: ctx.session.user.groups,
        };
    }),

    /**
     * Check if user has specific roles
     */
    hasRoles: protectedProcedure
        .input(z.object({ roles: z.array(z.string()) }))
        .query(({ ctx, input }) => {
            const userRoles = ctx.session.user.roles;
            return {
                hasAll: input.roles.every((role) => userRoles.includes(role)),
                hasAny: input.roles.some((role) => userRoles.includes(role)),
                userRoles,
            };
        }),

    /**
     * Check if user belongs to specific groups
     */
    hasGroups: protectedProcedure
        .input(z.object({ groups: z.array(z.string()) }))
        .query(({ ctx, input }) => {
            const userGroups = ctx.session.user.groups;
            return {
                hasAll: input.groups.every((group) => userGroups.includes(group)),
                hasAny: input.groups.some((group) => userGroups.includes(group)),
                userGroups,
            };
        }),
});
