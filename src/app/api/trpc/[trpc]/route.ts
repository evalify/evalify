import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/root";
import { createTRPCContext } from "@/server/trpc/context";
import { logger } from "@/lib/logger";

/**
 * tRPC API handler for Next.js App Router
 * Handles all /api/trpc/* requests
 */
const handler = async (req: Request) => {
    return fetchRequestHandler({
        endpoint: "/api/trpc",
        req,
        router: appRouter,
        createContext: createTRPCContext,
        onError:
            process.env.NODE_ENV === "development"
                ? ({ path, error }) => {
                      logger.error(
                          { path, error: error.message, code: error.code },
                          `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
                      );
                  }
                : undefined,
    });
};

export { handler as GET, handler as POST };
