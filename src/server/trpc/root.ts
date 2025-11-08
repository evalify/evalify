import { createTRPCRouter } from "./trpc";
import { userRouter } from "./routers/administrative/user";
import { courseRouter } from "./routers/administrative/course";
import { departmentRouter } from "./routers/administrative/department";
import { batchRouter } from "./routers/administrative/batch";
import { labRouter } from "./routers/administrative/lab";
import { semesterRouter } from "./routers/administrative/semester";
import { facultyCourseRouter } from "./routers/academic/faculty/course";
import { studentCourseRouter } from "./routers/academic/student/course";
import { bankRouter } from "./routers/academic/faculty/bank";
import { questionRouter } from "./routers/academic/faculty/question";

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
    facultyCourse: facultyCourseRouter,
    studentCourse: studentCourseRouter,
    bank: bankRouter,
    question: questionRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
