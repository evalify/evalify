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
    MatchOptions,
    ProgrammingLanguage,
    FillInBlanksAcceptedType,
} from "@/types/questions";

export interface StudentFillInBlanksConfig {
    blankCount: number;
    blankWeights: Record<number, number>;
    blankTypes: Record<number, FillInBlanksAcceptedType>;
    evaluationType: string;
}

export interface StudentDescriptiveConfig {
    minWords?: number;
    maxWords?: number;
}

export interface StudentCodingConfig {
    language: ProgrammingLanguage;
    templateCode?: string;
    boilerplateCode?: string;
    timeLimitMs?: number;
    memoryLimitMb?: number;
}

export interface StudentTestCase {
    id: string;
    input: string;
    visibility: string;
    marksWeightage?: number;
    orderIndex: number;
}

export interface StudentFileUploadConfig {
    allowedFileTypes?: string[];
    maxFileSizeInMB?: number;
    maxFiles?: number;
}

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
    question?: string;

    questionData?: MCQData | MMCQData;
    blankConfig?: StudentFillInBlanksConfig;
    options?: MatchOptions[];
    descriptiveConfig?: StudentDescriptiveConfig;
    codingConfig?: StudentCodingConfig;
    testCases?: StudentTestCase[];
    attachedFiles?: string[];
    fileUploadConfig?: StudentFileUploadConfig;
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
    studentAnswer: Record<string, string[]>; // { leftId: [rightId, ...] }
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
    name?: string;
    startTime?: string | Date | null;
    endTime?: string | Date | null;
    duration?: string | null;
    // Student-specific timing (when they started and when their time expires)
    studentStartTime?: string | Date | null;
    studentEndTime?: string | Date | null;
    studentDuration?: string | null;
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
