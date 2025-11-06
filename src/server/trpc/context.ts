import { auth } from "@/lib/auth/auth";
import type { Session } from "next-auth";
import { logger } from "@/lib/logger";

/**
 * Creates the context for tRPC procedures
 * This includes the user session with roles and groups from Keycloak
 */
export async function createTRPCContext() {
    const session = await auth();

    // Log context creation for debugging
    if (session?.user) {
        logger.info(
            {
                userId: session.user.id,
                roles: session.user.roles,
                groups: session.user.groups,
            },
            "tRPC context created"
        );
    }

    return {
        session,
    };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * Helper to get the session from context with type safety
 */
export function getSessionFromContext(ctx: Context): Session | null {
    if (ctx.session?.error) {
        logger.warn({ error: ctx.session.error }, "Session has error");
        return null;
    }
    return ctx.session;
}
