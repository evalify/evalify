"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useState } from "react";
import superjson from "superjson";
import type { AppRouter } from "@/server/trpc/root";

/**
 * Create tRPC React hooks
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Get the base URL for tRPC requests
 */
function getBaseUrl() {
    if (typeof window !== "undefined") {
        // Browser should use relative URL
        return "";
    }
    if (process.env.NEXT_REDIRECT) {
        return process.env.NEXT_REDIRECT;
    }

    if (process.env.VERCEL_URL) {
        // SSR should use absolute URL
        return `https://${process.env.VERCEL_URL}`;
    }
    // Dev environment
    return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * tRPC Provider Component
 * Wraps the app with React Query and tRPC providers
 */
export function TRPCProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // With SSR, we usually want to set some default staleTime
                        // above 0 to avoid refetching immediately on the client
                        staleTime: 60 * 1000, // 1 minute
                        refetchOnWindowFocus: false,
                        retry: 1,
                    },
                },
            })
    );

    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: `${getBaseUrl()}/api/trpc`,
                    transformer: superjson,
                    headers() {
                        return {
                            // You can add custom headers here if needed
                            "x-trpc-source": "react",
                        };
                    },
                }),
            ],
        })
    );

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </trpc.Provider>
    );
}
