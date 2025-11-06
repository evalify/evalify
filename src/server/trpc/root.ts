import { createTRPCRouter } from "./trpc";
import { userRouter } from "./routers/user";
import { courseRouter } from "./routers/course";
import { departmentRouter } from "./routers/department";
import { batchRouter } from "./routers/batch";
import { labRouter } from "./routers/lab";
import { semesterRouter } from "./routers/semester";

/**
 * Root tRPC router
 * Combines all routers into a single API
 */
export const appRouter = createTRPCRouter({
    user: userRouter,
    course: courseRouter,
    department: departmentRouter,
    batch: batchRouter,
    lab: labRouter,
    semester: semesterRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
