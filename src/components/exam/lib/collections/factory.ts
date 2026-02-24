/**
 * Exam Query Collections Factory
 *
 * This module provides factory functions to create TanStack Query Collections
 * for exam-related data. Collections automatically sync between local state
 * and the server, with support for optimistic updates and automatic rollback.
 *
 * Architecture:
 * - Questions Collection: Read-only data fetched from server via tRPC
 * - Responses Collection: Student answers with bidirectional sync to server
 * - State Collection: Client-side state (visited, marked for review) - local only
 *
 * @module features/exam/lib/collections
 */

import { createCollection, type Collection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import type { QueryClient } from "@tanstack/query-core";
import { logger } from "@/lib/logger";
import { examQueryKeys } from "../query-keys";
import type {
    QuestionItem,
    QuestionResponse,
    QuestionState,
    StudentAnswer,
    QuizMetadata,
    QuizInfo,
} from "../types";

/**
 * Create a Questions Collection
 *
 * This collection manages the quiz questions. It's read-only from the client
 * perspective - questions are fetched from the server and can't be modified.
 *
 * @param quizId - The quiz ID to fetch questions for
 * @param queryFn - Function to fetch questions from the server
 * @param queryClient - TanStack Query client instance
 *
 * @example
 * ```ts
 * import { queryClient } from '@/lib/trpc/react'
 *
 * const questionsCollection = createQuestionsCollection(
 *   'quiz-123',
 *   async () => {
 *     const { questions } = await trpc.exam.getStudentQuestions.query({ quizId: 'quiz-123' })
 *     return questions
 *   },
 *   queryClient
 * )
 * ```
 */
export function createQuestionsCollection(
    quizId: string,
    studentId: string,
    queryFn: () => Promise<QuestionItem[]>,
    queryClient: QueryClient
): Collection<QuestionItem, string, never, never, QuestionItem> {
    return createCollection(
        queryCollectionOptions<QuestionItem, string>({
            id: `questions-${quizId}-${studentId}`,
            queryKey: examQueryKeys.questions.byQuiz(quizId), // Query key can remain quiz-based as questions are same for all students usually, but if personalized, might need change. Keeping as is for now unless requested.
            staleTime: Infinity,
            gcTime: Infinity,
            queryClient,
            getKey: (item) => item.id,
            queryFn,
        })
    ) as Collection<QuestionItem, string, never, never, QuestionItem>;
}

/**
 * Create a Responses Collection
 *
 * This collection manages student responses to questions. It supports:
 * - Optimistic updates (immediate UI feedback)
 * - Automatic server sync via onUpdate/onInsert handlers
 * - Automatic rollback on errors
 *
 * @param quizId - The quiz ID
 * @param initialResponsesFn - Function to fetch initial responses from server
 * @param queryClient - TanStack Query client instance
 * @param saveAnswerFn - Function to save answer to server (tRPC mutation)
 *
 * @example
 * ```ts
 * import { queryClient } from '@/lib/trpc/react'
 * import { trpc } from '@/lib/trpc/client'
 *
 * const responsesCollection = createResponsesCollection(
 *   'quiz-123',
 *   async () => {
 *     const resp = await trpc.exam.getResponse.query({ quizId: 'quiz-123' })
 *     return resp.response?.response || {}
 *   },
 *   queryClient,
 *   async (responsePatch) => {
 *     await trpc.exam.saveAnswer.mutate({ quizId: 'quiz-123', responsePatch })
 *   }
 * )
 * ```
 */
export function createResponsesCollection(
    quizId: string,
    studentId: string,
    initialResponsesFn: () => Promise<Record<string, StudentAnswer>>,
    queryClient: QueryClient,
    saveAnswerFn?: (responsePatch: Record<string, StudentAnswer>) => Promise<void>
): Collection<QuestionResponse, string, never, never, QuestionResponse> {
    const collection = createCollection(
        queryCollectionOptions<QuestionResponse, string>({
            id: `responses-${quizId}-${studentId}`,
            queryKey: examQueryKeys.responses.byQuiz(quizId), // Ideally this should be specific to student, but typically query keys are [..., quizId, 'responses']. If the queryFn fetches for current user, it's fine.
            staleTime: Infinity,
            queryClient,
            getKey: (item) => item.questionId,
            queryFn: async () => {
                // Fetch the response object from server
                const responsesMap = await initialResponsesFn();

                // Convert to array format expected by collection
                const responses: QuestionResponse[] = Object.entries(responsesMap).map(
                    ([questionId, answer]) => ({
                        questionId,
                        response: answer as StudentAnswer,
                        timestamp: Date.now(),
                    })
                );

                return responses;
            },

            // Handle updates to existing responses
            onUpdate: async ({ transaction }) => {
                if (!saveAnswerFn) {
                    console.warn(
                        "[Response Update] No saveAnswerFn provided - skipping server sync"
                    );
                    return;
                }

                // Build response patch: { [questionId]: response }
                const responsePatch: Record<string, StudentAnswer> = {};
                for (const mutation of transaction.mutations) {
                    const resp = mutation.modified;
                    if (resp) {
                        responsePatch[resp.questionId] = resp.response;
                    }
                }

                logger.debug(
                    { quizId, questionIds: Object.keys(responsePatch) },
                    "Response update"
                );

                try {
                    await saveAnswerFn(responsePatch);
                    // Persist to synced data store so optimistic mutation removal doesn't revert
                    collection.utils.writeBatch(() => {
                        for (const mutation of transaction.mutations) {
                            if (mutation.modified) {
                                collection.utils.writeUpsert(mutation.modified);
                            }
                        }
                    });
                    return { refetch: false };
                } catch (error) {
                    logger.error({ error, quizId }, "Failed to save response update");
                    throw error;
                }
            },

            onInsert: async ({ transaction }) => {
                if (!saveAnswerFn) {
                    console.warn(
                        "[Response Insert] No saveAnswerFn provided - skipping server sync"
                    );
                    return;
                }

                const responsePatch: Record<string, StudentAnswer> = {};
                for (const mutation of transaction.mutations) {
                    const resp = mutation.modified;
                    if (resp) {
                        responsePatch[resp.questionId] = resp.response;
                    }
                }

                logger.debug(
                    { quizId, questionIds: Object.keys(responsePatch) },
                    "Response insert"
                );

                try {
                    await saveAnswerFn(responsePatch);
                    // Persist to synced data store so optimistic mutation removal doesn't revert
                    collection.utils.writeBatch(() => {
                        for (const mutation of transaction.mutations) {
                            if (mutation.modified) {
                                collection.utils.writeUpsert(mutation.modified);
                            }
                        }
                    });
                    return { refetch: false };
                } catch (error) {
                    logger.error({ error, quizId }, "Failed to save response insert");
                    throw error;
                }
            },
        })
    );

    return collection as Collection<QuestionResponse, string, never, never, QuestionResponse>;
}

/**
 * Create a Question State Collection
 *
 * This collection manages client-side state for questions:
 * - Visited status (has the student viewed this question?)
 * - Marked for review (has the student flagged this for later?)
 *
 * This state is NOT synced to the server - it's purely client-side.
 *
 * @param quizId - The quiz ID
 * @param questionIds - Array of all question IDs in the quiz
 * @param queryClient - TanStack Query client instance
 *
 * @example
 * ```ts
 * import { queryClient } from '@/lib/trpc/react'
 *
 * const stateCollection = createQuestionStateCollection(
 *   'quiz-123',
 *   ['q-1', 'q-2', 'q-3'],
 *   queryClient
 * )
 *
 * // Mark a question as visited
 * stateCollection.update('q-1', (draft) => {
 *   draft.visited = true
 * })
 *
 * // Toggle marked for review
 * stateCollection.update('q-2', (draft) => {
 *   draft.markedForReview = !draft.markedForReview
 * })
 * ```
 */
export function createQuestionStateCollection(
    quizId: string,
    studentId: string,
    questionIds: string[],
    queryClient: QueryClient
): Collection<QuestionState, string, never, never, QuestionState> {
    const collection = createCollection(
        queryCollectionOptions<QuestionState, string>({
            id: `state-${quizId}-${studentId}`,
            queryKey: examQueryKeys.state.byQuiz(quizId),
            staleTime: Infinity,
            queryClient,
            getKey: (item) => item.questionId,
            queryFn: async () => {
                // Initialize state for all questions
                const initialState: QuestionState[] = questionIds.map((id) => ({
                    questionId: id,
                    visited: false,
                    markedForReview: false,
                }));

                return initialState;
            },
            // Client-side only, no server sync needed
            // But we need to persist to the collection store
            onUpdate: async ({ transaction }) => {
                collection.utils.writeBatch(() => {
                    for (const mutation of transaction.mutations) {
                        if (mutation.modified) {
                            collection.utils.writeUpsert(mutation.modified);
                        }
                    }
                });
                return { refetch: false };
            },
            onInsert: async ({ transaction }) => {
                collection.utils.writeBatch(() => {
                    for (const mutation of transaction.mutations) {
                        if (mutation.modified) {
                            collection.utils.writeUpsert(mutation.modified);
                        }
                    }
                });
                return { refetch: false };
            },
        })
    );

    return collection as Collection<QuestionState, string, never, never, QuestionState>;
}

/**
 * Create a Quiz Metadata Collection
 *
 * This collection tracks quiz timing and auto-submit status.
 * It syncs with the server to ensure accurate end times.
 */
export function createQuizMetadataCollection(
    quizId: string,
    studentId: string,
    quizInfo: QuizInfo | null | undefined,
    queryClient: QueryClient
): Collection<QuizMetadata, string, never, never, QuizMetadata> {
    return createCollection(
        queryCollectionOptions<QuizMetadata, string>({
            id: `metadata-${quizId}-${studentId}`,
            queryKey: examQueryKeys.metadata.byQuiz(quizId),
            queryClient,
            getKey: (item) => item.quizId,
            queryFn: async () => {
                // Initialize from provided quiz info
                // Use student-specific end time if available, otherwise fall back to quiz end time
                const endTimeValue = quizInfo?.studentEndTime ?? quizInfo?.endTime;
                const endTime = endTimeValue ? new Date(endTimeValue).getTime() : null;

                // Use the actual submission status from server if available
                const serverStatus = quizInfo?.studentSubmissionStatus;
                const submissionStatus: "NOT_SUBMITTED" | "SUBMITTED" | "AUTO_SUBMITTED" =
                    serverStatus === "SUBMITTED" || serverStatus === "AUTO_SUBMITTED"
                        ? serverStatus
                        : "NOT_SUBMITTED";

                return [
                    {
                        quizId,
                        endTime,
                        autoSubmitEnabled: true,
                        submissionStatus,
                        lastChecked: Date.now(),
                    },
                ];
            },
            // Client-side mostly, but could sync status
            onUpdate: async () => {
                // No-op
            },
            onInsert: async () => {
                // No-op
            },
        })
    ) as Collection<QuizMetadata, string, never, never, QuizMetadata>;
}

/**
 * Collection factory with all collections
 *
 * This is a convenience function that creates all exam collections at once.
 *
 * @param quizId - The quiz ID
 * @param queryClient - TanStack Query client instance
 * @param options - Configuration options
 *
 * @example
 * ```ts
 * import { queryClient } from '@/lib/trpc/react'
 * import { trpc } from '@/lib/trpc/client'
 *
 * const collections = createExamCollections('quiz-123', queryClient, {
 *   fetchQuestions: async () => {
 *     const { questions } = await trpc.exam.getStudentQuestions.query({ quizId: 'quiz-123' })
 *     return questions
 *   },
 *   fetchResponses: async () => {
 *     const resp = await trpc.exam.getResponse.query({ quizId: 'quiz-123' })
 *     return resp.response?.response || {}
 *   },
 *   questionIds: ['q-1', 'q-2', 'q-3'],
 *   saveAnswer: async (responsePatch) => {
 *     await trpc.exam.saveAnswer.mutate({ quizId: 'quiz-123', responsePatch })
 *   }
 * })
 * ```
 */
export function createExamCollections(
    quizId: string,
    studentId: string,
    queryClient: QueryClient,
    options: {
        fetchQuestions: () => Promise<QuestionItem[]>;
        fetchResponses: () => Promise<Record<string, StudentAnswer>>;
        questionIds: string[];
        saveAnswer?: (responsePatch: Record<string, StudentAnswer>) => Promise<void>;
        quizInfo?: QuizInfo | null;
    }
) {
    return {
        questions: createQuestionsCollection(
            quizId,
            studentId,
            options.fetchQuestions,
            queryClient
        ),
        responses: createResponsesCollection(
            quizId,
            studentId,
            options.fetchResponses,
            queryClient,
            options.saveAnswer
        ),
        state: createQuestionStateCollection(quizId, studentId, options.questionIds, queryClient),
        metadata: createQuizMetadataCollection(quizId, studentId, options.quizInfo, queryClient),
    };
}

export type ExamCollections = ReturnType<typeof createExamCollections>;
