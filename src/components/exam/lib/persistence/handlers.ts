/**
 * Persistence Handlers for Exam Collections
 *
 * These handlers manage the synchronization between local state and server state.
 * They are called when mutations occur (insert, update, delete) and can:
 * - Persist changes to the backend
 * - Control refetch behavior
 * - Handle errors and rollbacks
 *
 * @module features/exam/lib/persistence
 */

import { logger } from "@/lib/logger";
import type { PersistenceContext, PersistenceResult, QuestionResponse } from "../types";

/**
 * Response persistence handlers
 *
 * These handlers manage student responses to quiz questions.
 * Note: Server sync will be implemented separately via the existing tRPC mutations.
 * For now, these handlers provide optimistic updates with logging.
 *
 * @example
 * ```ts
 * const collection = createCollection(
 *   queryCollectionOptions({
 *     onUpdate: (ctx) => responsePersistenceHandlers.onUpdate(quizId, ctx),
 *     // ... other options
 *   })
 * )
 * ```
 */
export const responsePersistenceHandlers = {
    /**
     * Handle response updates
     *
     * This is called when a student answers or modifies a question.
     * It logs changes for now. Server sync should be handled separately.
     */
    onUpdate: async (
        quizId: string,
        { transaction }: PersistenceContext<QuestionResponse>
    ): Promise<PersistenceResult> => {
        try {
            // Aggregate all responses into a single patch
            const responsePatch: Record<string, unknown> = {};

            transaction.mutations.forEach((mutation) => {
                if (mutation.changes?.response) {
                    const questionId = mutation.key;
                    responsePatch[questionId] = mutation.changes.response;
                }
            });

            if (Object.keys(responsePatch).length === 0) {
                return { refetch: false };
            }

            // Log response changes
            logger.info(
                { quizId, questionIds: Object.keys(responsePatch) },
                "Response changes detected"
            );

            // Don't refetch - we manage local state
            // TODO: Add server sync via separate mechanism
            return { refetch: false };
        } catch (error) {
            logger.error({ error, quizId }, "Failed to process response update");
            // Let the error propagate to trigger rollback
            throw error;
        }
    },
};

/**
 * Question state persistence handlers
 *
 * These handlers manage the visited and marked-for-review state.
 * Since this is client-side state only, we don't sync to server.
 *
 * @example
 * ```ts
 * const collection = createCollection(
 *   queryCollectionOptions({
 *     onUpdate: statePersistenceHandlers.onUpdate,
 *     // ... other options
 *   })
 * )
 * ```
 */
export const statePersistenceHandlers = {
    /**
     * Handle state updates (visited, marked for review)
     *
     * This is client-side only state, so we just skip the refetch
     * and let the optimistic update stand.
     */
    onUpdate: async (): Promise<PersistenceResult> => {
        // No server sync needed for client state
        return { refetch: false };
    },
};

/**
 * Create a debounced persistence handler
 *
 * Useful for batching rapid updates (e.g., typing in a text field)
 * to reduce server load.
 *
 * @param handler - The original handler to debounce
 * @param delayMs - Debounce delay in milliseconds
 *
 * @example
 * ```ts
 * const debouncedHandler = createDebouncedHandler(
 *   responsePersistenceHandlers.onUpdate,
 *   500
 * )
 * ```
 */
export const createDebouncedHandler = <T>(
    handler: (quizId: string, ctx: PersistenceContext<T>) => Promise<PersistenceResult>,
    delayMs: number
) => {
    let timeoutId: NodeJS.Timeout | null = null;
    let pendingMutations: PersistenceContext<T>["transaction"]["mutations"] = [];

    return async (quizId: string, ctx: PersistenceContext<T>): Promise<PersistenceResult> => {
        // Accumulate mutations
        pendingMutations.push(...ctx.transaction.mutations);

        // Clear existing timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        // Set new timeout
        return new Promise((resolve, reject) => {
            timeoutId = setTimeout(async () => {
                try {
                    const result = await handler(quizId, {
                        transaction: {
                            mutations: [...pendingMutations],
                        },
                    });
                    pendingMutations = [];
                    resolve(result);
                } catch (error) {
                    pendingMutations = [];
                    reject(error);
                }
            }, delayMs);
        });
    };
};
