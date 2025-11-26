/**
 * Custom React Hooks for Exam Collections
 *
 * These hooks provide a React-friendly interface to the exam collections,
 * handling initialization, updates, and state management using TanStack DB.
 *
 * @module features/exam/hooks
 */

"use client";

import { useMemo, useCallback } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import type { Collection } from "@tanstack/db";
import type { QuestionResponse, QuestionState, StudentAnswer } from "../lib/types";

/**
 * Hook for managing question responses
 *
 * Provides helper functions for updating and retrieving student responses.
 *
 * @param responsesCollection - The responses collection
 *
 * @example
 * ```tsx
 * const { saveResponse, getResponse, isAnswered } = useQuestionResponses(collections.responses)
 *
 * // Save a response
 * saveResponse('q-1', { studentAnswer: 'A' })
 *
 * // Check if answered
 * if (isAnswered('q-1')) {
 *   console.log('Question answered')
 * }
 * ```
 */
export function useQuestionResponses(
    responsesCollection: Collection<QuestionResponse, string, never, never, QuestionResponse>
) {
    /**
     * Get all responses using live query for reactivity
     */
    const { data: responses = [] } = useLiveQuery((q) =>
        q.from({ response: responsesCollection }).select(({ response }) => ({
            questionId: response.questionId,
            response: response.response,
            timestamp: response.timestamp,
        }))
    );

    /**
     * Save or update a response for a question
     */
    const saveResponse = useCallback(
        (questionId: string, answer: StudentAnswer) => {
            // Check if response exists
            const existingResponse = responsesCollection.get(questionId);

            if (existingResponse) {
                // Update existing response
                responsesCollection.update(questionId, (draft) => {
                    draft.response = answer;
                    draft.timestamp = Date.now();
                });
            } else {
                // Insert new response
                responsesCollection.insert({
                    questionId,
                    response: answer,
                    timestamp: Date.now(),
                });
            }
        },
        [responsesCollection]
    );

    /**
     * Get the current response for a question
     */
    const getResponse = useCallback(
        (questionId: string) => {
            return responsesCollection.get(questionId)?.response || null;
        },
        [responsesCollection]
    );

    /**
     * Check if a question has been answered
     */
    const isAnswered = useCallback(
        (questionId: string) => {
            const response = responsesCollection.get(questionId);
            return (
                response !== undefined &&
                response.response !== null &&
                Object.keys(response.response).length > 0
            );
        },
        [responsesCollection]
    );

    /**
     * Clear a response for a question
     */
    const clearResponse = useCallback(
        (questionId: string) => {
            responsesCollection.delete(questionId);
        },
        [responsesCollection]
    );

    return {
        responses,
        saveResponse,
        getResponse,
        isAnswered,
        clearResponse,
    };
}

/**
 * Hook for managing question state (visited, marked for review)
 *
 * @param stateCollection - The state collection
 *
 * @example
 * ```tsx
 * const { markAsVisited, toggleMarkForReview, isVisited, isMarkedForReview } =
 *   useQuestionState(collections.state)
 *
 * // Mark as visited when question is viewed
 * useEffect(() => {
 *   markAsVisited(questionId)
 * }, [questionId])
 *
 * // Toggle mark for review
 * <button onClick={() => toggleMarkForReview(questionId)}>
 *   {isMarkedForReview(questionId) ? 'Unmark' : 'Mark for Review'}
 * </button>
 * ```
 */
export function useQuestionState(
    stateCollection: Collection<QuestionState, string, never, never, QuestionState>
) {
    /**
     * Get all question states using live query
     */
    const { data: states = [] } = useLiveQuery((q) =>
        q.from({ state: stateCollection }).select(({ state }) => ({
            questionId: state.questionId,
            visited: state.visited,
            markedForReview: state.markedForReview,
        }))
    );

    /**
     * Mark a question as visited
     */
    const markAsVisited = useCallback(
        (questionId: string) => {
            const current = stateCollection.get(questionId);

            if (current) {
                stateCollection.update(questionId, (draft) => {
                    draft.visited = true;
                });
            } else {
                stateCollection.insert({
                    questionId,
                    visited: true,
                    markedForReview: false,
                });
            }
        },
        [stateCollection]
    );

    /**
     * Toggle marked for review status
     */
    const toggleMarkForReview = useCallback(
        (questionId: string) => {
            const current = stateCollection.get(questionId);

            if (current) {
                stateCollection.update(questionId, (draft) => {
                    draft.markedForReview = !draft.markedForReview;
                });
            } else {
                stateCollection.insert({
                    questionId,
                    visited: false,
                    markedForReview: true,
                });
            }
        },
        [stateCollection]
    );

    /**
     * Check if a question has been visited
     */
    const isVisited = useCallback(
        (questionId: string) => {
            return stateCollection.get(questionId)?.visited ?? false;
        },
        [stateCollection]
    );

    /**
     * Check if a question is marked for review
     */
    const isMarkedForReview = useCallback(
        (questionId: string) => {
            return stateCollection.get(questionId)?.markedForReview ?? false;
        },
        [stateCollection]
    );

    return {
        states,
        markAsVisited,
        toggleMarkForReview,
        isVisited,
        isMarkedForReview,
    };
}

/**
 * Hook for exam statistics
 *
 * Provides aggregated statistics about question responses and state.
 *
 * @param responsesCollection - The responses collection
 * @param stateCollection - The state collection
 * @param questionIds - Array of all question IDs
 *
 * @example
 * ```tsx
 * const stats = useExamStats(collections.responses, collections.state, questionIds)
 *
 * <div>
 *   <p>Answered: {stats.answered}/{stats.total}</p>
 *   <p>Unattempted: {stats.unattempted}</p>
 *   <p>Marked for Review: {stats.markedForReview}</p>
 * </div>
 * ```
 */
export function useExamStats(
    responsesCollection: Collection<QuestionResponse, string, never, never, QuestionResponse>,
    stateCollection: Collection<QuestionState, string, never, never, QuestionState>,
    questionIds: string[]
) {
    /**
     * Get all responses and states using live queries
     */
    const { data: responses = [] } = useLiveQuery((q) =>
        q.from({ response: responsesCollection }).select(({ response }) => response)
    );

    const { data: states = [] } = useLiveQuery((q) =>
        q.from({ state: stateCollection }).select(({ state }) => state)
    );

    /**
     * Calculate statistics from collections
     */
    const stats = useMemo(() => {
        const responsesMap = new Map(responses.map((r) => [r.questionId, r]));
        const statesMap = new Map(states.map((s) => [s.questionId, s]));

        let answered = 0;
        let markedForReview = 0;
        let visited = 0;

        questionIds.forEach((questionId) => {
            const response = responsesMap.get(questionId);
            const state = statesMap.get(questionId);

            if (response?.response && Object.keys(response.response).length > 0) {
                answered++;
            }

            if (state?.markedForReview) {
                markedForReview++;
            }

            if (
                state?.visited &&
                !(response?.response && Object.keys(response.response).length > 0)
            ) {
                visited++;
            }
        });

        const total = questionIds.length;
        const unattempted = total - answered - visited;

        return {
            answered,
            unattempted,
            markedForReview,
            visited,
            total,
        };
    }, [responses, states, questionIds]);

    return stats;
}
