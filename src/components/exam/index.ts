/**
 * Exam Module - Main Exports
 *
 * Central export point for the exam module's query collection functionality.
 *
 * @module features/exam
 */

// Providers
export { ExamQueryProvider, useExamCollectionsContext, withExamCollections } from "./providers";

// Export hooks
export { useQuestionResponses, useQuestionState, useExamStats } from "./hooks";

// Collections
export {
    createQuestionsCollection,
    createResponsesCollection,
    createQuestionStateCollection,
    createExamCollections,
} from "./lib/collections";

// Persistence Handlers
export {
    responsePersistenceHandlers,
    statePersistenceHandlers,
    createDebouncedHandler,
} from "./lib/persistence";

// Query Keys
export { examQueryKeys } from "./lib/query-keys";

// Types
export type {
    QuestionItem,
    QuestionResponse,
    QuestionState,
    QuizSection,
    QuizInfo,
    PersistenceContext,
    PersistenceResult,
} from "./lib/types";
