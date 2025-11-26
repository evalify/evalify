/**
 * Type definitions for Exam Collections
 *
 * @module features/exam/lib/types
 */

/**
 * Question item stored in the collection
 */
import {
    QuestionType,
    Difficulty,
    CourseOutcome,
    BloomsLevel,
    MCQData,
    MMCQData,
    FillInBlanksConfig,
    MatchOptions,
    DescriptiveConfig,
    CodingConfig,
    TestCase,
    FileUploadConfig,
    ProgrammingLanguage,
    MCQSolution,
    MMCQSolution,
    TrueFalseSolution,
    FillTheBlankSolution,
    MatchingSolution,
    DescriptiveSolution,
    CodingSolution,
} from "@/types/questions";

/**
 * Question item stored in the collection
 */
export interface QuestionItem {
    id: string;
    type: QuestionType;
    sectionId?: string | null;
    orderIndex: number;
    marks?: number | null;
    negativeMarks?: number | null;
    difficulty?: Difficulty | null;
    courseOutcome?: CourseOutcome | null;
    bloomTaxonomyLevel?: BloomsLevel | null;
    question?: string; // HTML content

    // Question-type specific data (mutually exclusive based on 'type')
    questionData?: MCQData | MMCQData;
    blankConfig?: FillInBlanksConfig;
    options?: MatchOptions[];
    descriptiveConfig?: DescriptiveConfig;
    codingConfig?: CodingConfig;
    testCases?: TestCase[];
    attachedFiles?: string[];
    fileUploadConfig?: FileUploadConfig;
    trueFalseAnswer?: boolean;

    // Solution and explanation
    solution?:
        | MCQSolution
        | MMCQSolution
        | TrueFalseSolution
        | FillTheBlankSolution
        | MatchingSolution
        | DescriptiveSolution
        | CodingSolution;
    explanation?: string;

    createdById?: string | null;
    created_at?: Date | null;
    updated_at?: Date | null;
}

/**
 * Student answer types for different question types
 */
export interface MCQStudentAnswer {
    studentAnswer: string; // optionId
}

export interface MMCQStudentAnswer {
    studentAnswer: string[]; // array of optionIds
}

export interface TrueFalseStudentAnswer {
    studentAnswer: string; // "True" or "False"
}

export interface DescriptiveStudentAnswer {
    studentAnswer: string; // text answer
}

export interface FillInBlanksStudentAnswer {
    studentAnswer: Record<string, string>; // { blankId: answer }
}

export interface MatchingStudentAnswer {
    studentAnswer: Record<string, string>; // { leftId: rightId }
}

export interface CodingStudentAnswer {
    studentAnswer: {
        code: string;
        language: ProgrammingLanguage;
    };
}

export interface FileUploadStudentAnswer {
    studentAnswer: {
        fileUrl: string;
        fileName: string;
        fileSize: number;
    };
}

/**
 * Union type for all student answers
 */
export type StudentAnswer =
    | MCQStudentAnswer
    | MMCQStudentAnswer
    | TrueFalseStudentAnswer
    | DescriptiveStudentAnswer
    | FillInBlanksStudentAnswer
    | MatchingStudentAnswer
    | CodingStudentAnswer
    | FileUploadStudentAnswer;

/**
 * Student response for a specific question
 */
export interface QuestionResponse {
    questionId: string;
    response: StudentAnswer;
    timestamp: number;
}

/**
 * Question state (visited, marked for review)
 */
export interface QuestionState {
    questionId: string;
    visited: boolean;
    markedForReview: boolean;
}

/**
 * Quiz section metadata
 */
export interface QuizSection {
    id: string;
    name: string;
    orderIndex: number;
}

/**
 * Quiz information
 */
export interface QuizInfo {
    id: string;
    name: string;
    startTime: string | Date | null;
    endTime: string | Date | null;
    duration: string | null;
}

/**
 * Quiz metadata for auto-submit tracking
 */
export interface QuizMetadata {
    quizId: string;
    endTime: number | null; // Timestamp
    autoSubmitEnabled: boolean;
    submissionStatus: "NOT_SUBMITTED" | "SUBMITTED" | "AUTO_SUBMITTED";
    lastChecked: number; // Timestamp
}

/**
 * Persistence handler context for onInsert/onUpdate/onDelete
 */
export interface PersistenceContext<T> {
    transaction: {
        mutations: Array<{
            key: string;
            modified?: T;
            changes?: Partial<T>;
        }>;
    };
}

/**
 * Return type for persistence handlers
 */
export interface PersistenceResult {
    refetch?: boolean;
}
