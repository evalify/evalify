import "server-only";

import { createCallerFactory } from "./trpc";
import { appRouter } from "./root";
import { createTRPCContext } from "./context";

/**
 * Server-side tRPC caller
 * Use this for Server Components and Server Actions
 *
 * @example
 * ```tsx
 * // In a Server Component
 * import { serverTRPC } from "@/server/trpc/server";
 *
 * export default async function MyPage() {
 *   const user = await serverTRPC.auth.getUser();
 *   return <div>Hello {user.name}</div>;
 * }
 * ```
 */
const createCaller = createCallerFactory(appRouter);

/**
 * Creates a server-side tRPC caller with context
 */
export const serverTRPC = async (): Promise<ReturnType<typeof createCaller>> => {
    const context = await createTRPCContext();
    return createCaller(context);
};
