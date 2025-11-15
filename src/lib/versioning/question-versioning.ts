/**
 * Question Versioning Utilities
 *
 * Provides utilities for managing versioned question data and solutions.
 * Uses wrapper approach - doesn't modify core types.
 */

import {
    VersionedJson,
    QuestionType,
    MCQData,
    MMCQData,
    MCQSolution,
    MMCQSolution,
    TrueFalseSolution,
    FillInBlanksConfig,
    FillTheBlankData,
    FillTheBlankSolution,
    MatchingData,
    MatchingSolution,
    DescriptiveData,
    DescriptiveSolution,
} from "@/types/questions";

/**
 * Current versions for each question type's data and solution
 */
export const QUESTION_VERSIONS = {
    [QuestionType.MCQ]: {
        DATA: 1,
        SOLUTION: 1,
    },
    [QuestionType.MMCQ]: {
        DATA: 1,
        SOLUTION: 1,
    },
    [QuestionType.TRUE_FALSE]: {
        DATA: 1,
        SOLUTION: 1,
    },
    [QuestionType.FILL_THE_BLANK]: {
        DATA: 1,
        SOLUTION: 1,
    },
    [QuestionType.MATCHING]: {
        DATA: 1,
        SOLUTION: 1,
    },
    [QuestionType.DESCRIPTIVE]: {
        DATA: 1,
        SOLUTION: 1,
    },
    [QuestionType.CODING]: {
        DATA: 1,
        SOLUTION: 1,
    },
    [QuestionType.FILE_UPLOAD]: {
        DATA: 1,
        SOLUTION: 1,
    },
} as const;

/**
 * Versioned wrapper types for storage
 */
export type VersionedMCQData = VersionedJson<MCQData>;
export type VersionedMMCQData = VersionedJson<MMCQData>;
export type VersionedMCQSolution = VersionedJson<MCQSolution>;
export type VersionedMMCQSolution = VersionedJson<MMCQSolution>;
export type VersionedTrueFalseSolution = VersionedJson<TrueFalseSolution>;
export type VersionedFillInBlanksConfig = VersionedJson<FillInBlanksConfig>;
export type VersionedFillTheBlankData = VersionedJson<FillTheBlankData>;
export type VersionedFillTheBlankSolution = VersionedJson<FillTheBlankSolution>;
export type VersionedMatchingData = VersionedJson<MatchingData>;
export type VersionedMatchingSolution = VersionedJson<MatchingSolution>;
export type VersionedDescriptiveData = VersionedJson<DescriptiveData>;
export type VersionedDescriptiveSolution = VersionedJson<DescriptiveSolution>;

/**
 * Creates a versioned wrapper
 */
export function wrapWithVersion<T>(data: T, version: number): VersionedJson<T> {
    return { version, data };
}

/**
 * Extracts data from versioned wrapper
 */
export function unwrapVersion<T>(versioned: VersionedJson<T>): T {
    return versioned.data;
}

/**
 * Gets version number
 */
export function getVersion<T>(versioned: VersionedJson<T>): number {
    return versioned.version;
}

/**
 * Creates versioned MCQ data
 */
export function versionMCQData(data: MCQData): VersionedMCQData {
    return wrapWithVersion(data, QUESTION_VERSIONS[QuestionType.MCQ].DATA);
}

/**
 * Creates versioned MCQ solution
 */
export function versionMCQSolution(solution: MCQSolution): VersionedMCQSolution {
    return wrapWithVersion(solution, QUESTION_VERSIONS[QuestionType.MCQ].SOLUTION);
}

/**
 * Creates versioned MMCQ data
 */
export function versionMMCQData(data: MMCQData): VersionedMMCQData {
    return wrapWithVersion(data, QUESTION_VERSIONS[QuestionType.MMCQ].DATA);
}

/**
 * Creates versioned MMCQ solution
 */
export function versionMMCQSolution(solution: MMCQSolution): VersionedMMCQSolution {
    return wrapWithVersion(solution, QUESTION_VERSIONS[QuestionType.MMCQ].SOLUTION);
}

/**
 * Creates versioned TRUE_FALSE solution
 */
export function versionTrueFalseSolution(solution: TrueFalseSolution): VersionedTrueFalseSolution {
    return wrapWithVersion(solution, QUESTION_VERSIONS[QuestionType.TRUE_FALSE].SOLUTION);
}

/**
 * Creates versioned FILL_THE_BLANK config
 */
export function versionFillInBlanksConfig(config: FillInBlanksConfig): VersionedFillInBlanksConfig {
    return wrapWithVersion(config, QUESTION_VERSIONS[QuestionType.FILL_THE_BLANK].DATA);
}

/**
 * Creates versioned FILL_THE_BLANK data (without acceptableAnswers)
 */
export function versionFillTheBlankData(data: FillTheBlankData): VersionedFillTheBlankData {
    return wrapWithVersion(data, QUESTION_VERSIONS[QuestionType.FILL_THE_BLANK].DATA);
}

/**
 * Creates versioned FILL_THE_BLANK solution (acceptableAnswers only)
 */
export function versionFillTheBlankSolution(
    solution: FillTheBlankSolution
): VersionedFillTheBlankSolution {
    return wrapWithVersion(solution, QUESTION_VERSIONS[QuestionType.FILL_THE_BLANK].SOLUTION);
}

/**
 * Creates versioned MATCHING data
 */
export function versionMatchingData(data: MatchingData): VersionedMatchingData {
    return wrapWithVersion(data, QUESTION_VERSIONS[QuestionType.MATCHING].DATA);
}

/**
 * Creates versioned MATCHING solution
 */
export function versionMatchingSolution(solution: MatchingSolution): VersionedMatchingSolution {
    return wrapWithVersion(solution, QUESTION_VERSIONS[QuestionType.MATCHING].SOLUTION);
}

/**
 * Creates versioned DESCRIPTIVE data
 */
export function versionDescriptiveData(data: DescriptiveData): VersionedDescriptiveData {
    return wrapWithVersion(data, QUESTION_VERSIONS[QuestionType.DESCRIPTIVE].DATA);
}

/**
 * Creates versioned DESCRIPTIVE solution
 */
export function versionDescriptiveSolution(
    solution: DescriptiveSolution
): VersionedDescriptiveSolution {
    return wrapWithVersion(solution, QUESTION_VERSIONS[QuestionType.DESCRIPTIVE].SOLUTION);
}
