/**
 * Centralized Query Key Factory for Exam Module
 *
 * This module provides type-safe query keys for all exam-related queries.
 * Using a factory pattern ensures consistency and makes refactoring easier.
 *
 * @module features/exam/lib/query-keys
 */

/**
 * Query key factory for exam-related queries
 *
 * Benefits:
 * - Type-safe query keys
 * - Centralized management
 * - Easy refactoring
 * - Consistent invalidation
 *
 * @example
 * ```ts
 * // Get all questions for a quiz
 * const key = examQueryKeys.questions.byQuiz('quiz-123')
 *
 * // Get a specific question's response
 * const key = examQueryKeys.responses.byQuestion('quiz-123', 'q-456')
 * ```
 */
export const examQueryKeys = {
    /**
     * All exam-related queries
     */
    all: ["exam"] as const,

    /**
     * Quiz-level queries
     */
    quiz: {
        all: () => [...examQueryKeys.all, "quiz"] as const,
        byId: (quizId: string) => [...examQueryKeys.quiz.all(), quizId] as const,
        info: (quizId: string) => [...examQueryKeys.quiz.byId(quizId), "info"] as const,
        sections: (quizId: string) => [...examQueryKeys.quiz.byId(quizId), "sections"] as const,
    },

    /**
     * Questions collection queries
     */
    questions: {
        all: () => [...examQueryKeys.all, "questions"] as const,
        byQuiz: (quizId: string) => [...examQueryKeys.questions.all(), quizId] as const,
        bySection: (quizId: string, sectionId: string) =>
            [...examQueryKeys.questions.byQuiz(quizId), "section", sectionId] as const,
    },

    /**
     * Student responses collection queries
     */
    responses: {
        all: () => [...examQueryKeys.all, "responses"] as const,
        byQuiz: (quizId: string) => [...examQueryKeys.responses.all(), quizId] as const,
        byQuestion: (quizId: string, questionId: string) =>
            [...examQueryKeys.responses.byQuiz(quizId), questionId] as const,
    },

    /**
     * Quiz state queries (visited, marked for review, etc.)
     */
    state: {
        all: () => [...examQueryKeys.all, "state"] as const,
        byQuiz: (quizId: string) => [...examQueryKeys.state.all(), quizId] as const,
        visited: (quizId: string) => [...examQueryKeys.state.byQuiz(quizId), "visited"] as const,
        marked: (quizId: string) => [...examQueryKeys.state.byQuiz(quizId), "marked"] as const,
    },

    /**
     * Quiz metadata queries (timing, auto-submit status)
     */
    metadata: {
        all: () => [...examQueryKeys.all, "metadata"] as const,
        byQuiz: (quizId: string) => [...examQueryKeys.metadata.all(), quizId] as const,
    },
} as const;

/**
 * Helper type to extract query key types
 */
export type ExamQueryKey = ReturnType<
    (typeof examQueryKeys)[keyof typeof examQueryKeys][keyof (typeof examQueryKeys)[keyof typeof examQueryKeys]]
>;
