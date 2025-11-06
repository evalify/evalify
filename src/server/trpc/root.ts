import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { userRouter } from "./routers/user";
import { courseRouter } from "./routers/course";

/**
 * Root tRPC router
 * Combines all routers into a single API
 */
export const appRouter = createTRPCRouter({
    auth: authRouter,
    user: userRouter,
    course: courseRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
