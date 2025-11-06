import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Context } from "./context";
import { getSessionFromContext } from "./context";
import { hasAccess, UserType } from "@/lib/auth/utils";
import { logger } from "@/lib/logger";

/**
 * Initialize tRPC with context and error formatting
 */
const t = initTRPC.context<Context>().create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
        return {
            ...shape,
            data: {
                ...shape.data,
                zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
            },
        };
    },
});

/**
 * Export reusable router and procedure builders
 */
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

/**
 * Public (unauthenticated) procedure
 * Anyone can call these endpoints
 */
export const publicProcedure = t.procedure;

/**
 * Middleware to ensure user is authenticated
 */
const isAuthenticated = t.middleware(async ({ ctx, next }) => {
    const session = getSessionFromContext(ctx);

    if (!session?.user) {
        logger.warn("Unauthorized access attempt");
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to access this resource",
        });
    }

    return next({
        ctx: {
            ...ctx,
            session,
        },
    });
});

/**
 * Protected procedure - requires authentication
 * Use this for endpoints that need a logged-in user
 */
export const protectedProcedure = t.procedure.use(isAuthenticated);

/**
 * Role-based access control middleware factory
 * @param requiredRoles - Array of roles that have access
 * @param requiredGroups - Array of groups that have access (optional)
 */
export function createRBACMiddleware(requiredRoles: UserType[], requiredGroups: string[] = []) {
    return t.middleware(async ({ ctx, next }) => {
        const session = getSessionFromContext(ctx);

        if (!session?.user) {
            logger.warn("Unauthorized access attempt - no session");
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "You must be logged in to access this resource",
            });
        }

        const userHasAccess = hasAccess(
            session.user.roles,
            session.user.groups,
            requiredRoles,
            requiredGroups
        );

        if (!userHasAccess) {
            logger.warn(
                {
                    userId: session.user.id,
                    userRoles: session.user.roles,
                    userGroups: session.user.groups,
                    requiredRoles,
                    requiredGroups,
                },
                "Access denied - insufficient permissions"
            );

            throw new TRPCError({
                code: "FORBIDDEN",
                message: "You do not have permission to access this resource",
            });
        }

        logger.info(
            {
                userId: session.user.id,
                roles: session.user.roles,
                groups: session.user.groups,
            },
            "Access granted"
        );

        return next({
            ctx: {
                ...ctx,
                session,
            },
        });
    });
}

/**
 * Admin-only procedure
 * Only users with 'admin' role can call these endpoints
 */
export const adminProcedure = protectedProcedure.use(createRBACMiddleware([UserType.ADMIN]));

/**
 * Faculty/Staff procedure
 * Users with 'faculty' role can call these endpoints
 */
export const facultyProcedure = protectedProcedure.use(createRBACMiddleware([UserType.STAFF]));

/**
 * Manager procedure
 * Users with 'manager' role can call these endpoints
 */
export const managerProcedure = protectedProcedure.use(createRBACMiddleware([UserType.MANAGER]));

/**
 * Student procedure
 * Users with 'student' role can call these endpoints
 */
export const studentProcedure = protectedProcedure.use(createRBACMiddleware([UserType.STUDENT]));

/**
 * Custom procedure factory for complex RBAC scenarios
 * Use this when you need specific role + group combinations
 *
 * @example
 * const myProcedure = createCustomProcedure(
 *   [UserType.FACULTY, UserType.MANAGER],
 *   ['department-cs', 'department-ee']
 * );
 */
export function createCustomProcedure(requiredRoles: UserType[], requiredGroups: string[] = []) {
    return protectedProcedure.use(createRBACMiddleware(requiredRoles, requiredGroups));
}
