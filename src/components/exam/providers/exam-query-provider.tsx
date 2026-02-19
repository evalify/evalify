/**
 * Exam Query Provider
 *
 * This provider wraps exam pages and initializes the TanStack Query Collections
 * for managing exam state. It handles:
 * - Collection initialization
 * - Context management
 * - Error boundaries
 *
 * @module features/exam/providers
 */

"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createExamCollections, type ExamCollections } from "../lib/collections";
import { QuestionItem, StudentAnswer, QuizInfo } from "../lib/types";

/**
 * Exam collections context type
 */
interface ExamCollectionsContext {
    quizId: string;
    collections: ExamCollections | null;
}

/**
 * React context for exam collections
 */
const ExamCollectionsContext = createContext<ExamCollectionsContext | undefined>(undefined);

/**
 * Props for ExamQueryProvider
 */
interface ExamQueryProviderProps {
    quizId: string;
    studentId: string;
    fetchQuestions: () => Promise<QuestionItem[]>;
    fetchResponses: () => Promise<Record<string, StudentAnswer>>;
    questionIds: string[];
    saveAnswer?: (responsePatch: Record<string, StudentAnswer>) => Promise<void>;
    /**
     * Quiz information including timing
     */
    quizInfo?: QuizInfo | null;
    /**
     * Child components
     */
    children: React.ReactNode;
}

/**
 * Exam Query Provider Component
 *
 * Wraps exam pages and provides access to TanStack Query Collections.
 *
 * @example
 * ```tsx
 * // In your exam page
 * export default function ExamPage({ quizId }: { quizId: string }) {
 *   return (
 *     <ExamQueryProvider
 *       quizId={quizId}
 *       fetchQuestions={async () => {
 *         const { questions } = await trpc.exam.getStudentQuestions.query({ quizId })
 *         return questions
 *       }}
 *       fetchResponses={async () => {
 *         const resp = await trpc.exam.getResponse.query({ quizId })
 *         return resp.response?.response || {}
 *       }}
 *       saveAnswer={async (responsePatch) => {
 *         await trpc.exam.saveAnswer.mutate({ quizId, responsePatch })
 *       }}
 *       questionIds={questionIds}
 *     >
 *       <ExamContent />
 *     </ExamQueryProvider>
 *   )
 * }
 * ```
 */
export function ExamQueryProvider({
    quizId,
    studentId,
    fetchQuestions,
    fetchResponses,
    saveAnswer,
    questionIds,
    quizInfo,
    children,
}: ExamQueryProviderProps) {
    const queryClient = useQueryClient();

    const collections = useMemo(() => {
        if (!queryClient) return null;

        return createExamCollections(quizId, studentId, queryClient, {
            fetchQuestions,
            fetchResponses,
            saveAnswer,
            questionIds,
            quizInfo,
        });
    }, [
        queryClient,
        quizId,
        studentId,
        fetchQuestions,
        fetchResponses,
        saveAnswer,
        questionIds,
        quizInfo,
    ]);

    const contextValue = useMemo(
        () => ({
            quizId,
            collections,
        }),
        [quizId, collections]
    );

    return (
        <ExamCollectionsContext.Provider value={contextValue}>
            {children}
        </ExamCollectionsContext.Provider>
    );
}

/**
 * Hook to access exam collections from context
 *
 * Must be used within an ExamQueryProvider.
 *
 * @throws Error if used outside ExamQueryProvider
 *
 */
export function useExamCollectionsContext() {
    const context = useContext(ExamCollectionsContext);

    if (!context) {
        throw new Error("useExamCollectionsContext must be used within ExamQueryProvider");
    }

    return context;
}

/**
 * Higher-order component to wrap components with ExamQueryProvider
 *
 * Useful for page-level components.
 *
 */
export function withExamCollections<P extends object>(
    Component: React.ComponentType<P>,
    config: {
        getQuizId: (props: P) => string;
        getStudentId: (props: P) => string;
        getFetchQuestions: (props: P) => () => Promise<QuestionItem[]>;
        getFetchResponses: (props: P) => () => Promise<Record<string, StudentAnswer>>;
        getQuestionIds: (props: P) => string[];
    }
) {
    return function WithExamCollections(props: P) {
        return (
            <ExamQueryProvider
                quizId={config.getQuizId(props)}
                studentId={config.getStudentId(props)}
                fetchQuestions={config.getFetchQuestions(props)}
                fetchResponses={config.getFetchResponses(props)}
                questionIds={config.getQuestionIds(props)}
            >
                <Component {...props} />
            </ExamQueryProvider>
        );
    };
}
