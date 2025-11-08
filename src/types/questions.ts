export enum QuestionType {
    MCQ = "MCQ",
    MMCQ = "MMCQ",
    TRUE_FALSE = "TRUE_FALSE",
    FILL_THE_BLANK = "FILL_THE_BLANK",
    MATCHING = "MATCHING",
    DESCRIPTIVE = "DESCRIPTIVE",
    CODING = "CODING",
    FILE_UPLOAD = "FILE_UPLOAD",
}

export enum TestCaseVisibility {
    VISIBLE = "VISIBLE",
    HIDDEN = "HIDDEN",
}

export enum ProgrammingLanguage {
    JAVA = "JAVA",
    PYTHON = "PYTHON",
    CPP = "CPP",
    JAVASCRIPT = "JAVASCRIPT",
    C = "C",
    OCTAVE = "OCTAVE",
    SCALA = "SCALA",
}

export enum BloomsLevel {
    REMEMBER = "REMEMBER",
    UNDERSTAND = "UNDERSTAND",
    APPLY = "APPLY",
    ANALYZE = "ANALYZE",
    EVALUATE = "EVALUATE",
    CREATE = "CREATE",
}

export enum Difficulty {
    EASY = "EASY",
    MEDIUM = "MEDIUM",
    HARD = "HARD",
}

export enum CourseOutcome {
    CO1 = "CO1",
    CO2 = "CO2",
    CO3 = "CO3",
    CO4 = "CO4",
    CO5 = "CO5",
    CO6 = "CO6",
    CO7 = "CO7",
    CO8 = "CO8",
}

export enum FillInBlanksEvaluationType {
    STRICT = "STRICT",
    NORMAL = "NORMAL",
    LENIENT = "LENIENT",
}

export enum FillInBlanksAcceptedType {
    TEXT = "TEXT",
    NUMBER = "NUMBER",
    UPPERCASE = "UPPERCASE",
    LOWERCASE = "LOWERCASE",
}

export interface VersionedJson<T> {
    version: number;
    data: T;
}

export interface BaseQuestion {
    id?: string;
    type: QuestionType;
    question: string;
    explanation?: string;
    marks: number;
    negativeMarks: number;
    topics?: { topicId: string; topicName: string }[];
    bloomsLevel?: BloomsLevel;
    difficulty?: Difficulty;
    courseOutcome?: CourseOutcome;
    createdBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface MCQQuestion extends BaseQuestion {
    type: QuestionType.MCQ;
    questionData: MCQData;
    solution: MCQSolution;
}

export interface MMCQQuestion extends BaseQuestion {
    type: QuestionType.MMCQ;
    questionData: MMCQData;
    solution: MMCQSolution;
}

export interface TrueFalseQuestion extends BaseQuestion {
    type: QuestionType.TRUE_FALSE;
    trueFalseAnswer?: boolean;
}

export interface FillInBlanksQuestion extends BaseQuestion {
    type: QuestionType.FILL_THE_BLANK;
    blankConfig: FillInBlanksConfig;
}

export interface MatchTheFollowingQuestion extends BaseQuestion {
    type: QuestionType.MATCHING;
    options: MatchOptions[];
}

export interface DescriptiveQuestion extends BaseQuestion {
    type: QuestionType.DESCRIPTIVE;
    descriptiveConfig: DescriptiveConfig;
}

export interface CodingQuestion extends BaseQuestion {
    type: QuestionType.CODING;
    codingConfig: CodingConfig;
    testCases: TestCase[];
}

export interface FileUploadQuestion extends BaseQuestion {
    type: QuestionType.FILE_UPLOAD;
    attachedFiles: string[];
    fileUploadConfig: FileUploadConfig;
}

export type Question =
    | MCQQuestion
    | MMCQQuestion
    | TrueFalseQuestion
    | FillInBlanksQuestion
    | MatchTheFollowingQuestion
    | DescriptiveQuestion
    | CodingQuestion
    | FileUploadQuestion;

export interface QuestionOption {
    id: string;
    optionText: string;
    orderIndex: number;
    isCorrect: boolean;
}

export interface MatchOptions {
    id: string;
    isLeft: boolean;
    text: string;
    orderIndex: number;
    matchPairIds?: string[];
}

export interface QuestionSettings {
    marks: number;
    difficulty: string;
    bloomsTaxonomy: string;
    co: number;
    negativeMarks: number;
    topicIds: string[];
}

export interface FillInBlanksConfig {
    blankCount: number;
    acceptableAnswers: Record<
        number,
        {
            answers: string[];
            type: FillInBlanksAcceptedType;
        }
    >;
    blankWeights: Record<number, number>;
    evaluationType: FillInBlanksEvaluationType;
}

export interface DescriptiveConfig {
    modelAnswer?: string;
    keywords?: string[];
    minWords?: number;
    maxWords?: number;
}

export interface CodingConfig {
    language: ProgrammingLanguage;
    templateCode?: string;
    boilerplateCode?: string;
    referenceSolution?: string;
    timeLimitMs?: number;
    memoryLimitMb?: number;
}

export interface TestCase {
    id: string;
    input: string;
    expectedOutput: string;
    visibility: TestCaseVisibility;
    marksWeightage?: number;
    orderIndex: number;
}

export interface FileUploadConfig {
    allowedFileTypes?: string[];
    maxFileSizeInMB?: number;
    maxFiles?: number;
}

// Payload types for question creation and solutions
export type MCQData = {
    options: Omit<QuestionOption, "isCorrect">[];
};

export type MMCQData = MCQData;

export type FillTheBlankData = {
    config: Omit<FillInBlanksConfig, "acceptedableAnswers">;
};

export type MatchingData = {
    options: Omit<MatchOptions, "matchPairIds">[];
};

export type DescriptiveData = {
    config: Omit<DescriptiveConfig, "modelAnswer" | "keywords">;
};

export type CodingData = {
    config: Omit<CodingConfig, "referenceSolution">;
    testCases: Omit<TestCase, "expectedOutput">[];
};

export type FileUploadData = {
    attachedFiles: string[];
    config: FileUploadConfig;
};

export type QuestionDataPayload =
    | { type: QuestionType.MCQ; data: MCQData }
    | { type: QuestionType.MMCQ; data: MMCQData }
    | { type: QuestionType.FILL_THE_BLANK; data: FillTheBlankData }
    | { type: QuestionType.MATCHING; data: MatchingData }
    | { type: QuestionType.DESCRIPTIVE; data: DescriptiveData }
    | { type: QuestionType.CODING; data: CodingData }
    | { type: QuestionType.FILE_UPLOAD; data: FileUploadData };

export type MCQSolution = {
    correctOptions: Pick<QuestionOption, "id" | "isCorrect">[];
};

export type MMCQSolution = {
    correctOptions: Pick<QuestionOption, "id" | "isCorrect">[];
};

export type TrueFalseSolution = Pick<TrueFalseQuestion, "trueFalseAnswer">;

export type FillTheBlankSolution = Pick<FillInBlanksConfig, "acceptableAnswers">;

export type MatchingSolution = {
    options: Pick<MatchOptions, "id" | "matchPairIds">[];
};

export type DescriptiveSolution = Pick<DescriptiveConfig, "modelAnswer" | "keywords">;

export type CodingSolution = Pick<CodingConfig, "referenceSolution"> & {
    testCases: Pick<TestCase, "id" | "expectedOutput">[];
};

export type SolutionPayload =
    | { type: QuestionType.MCQ; data: MCQSolution }
    | { type: QuestionType.MMCQ; data: MMCQSolution }
    | { type: QuestionType.TRUE_FALSE; data: TrueFalseSolution }
    | { type: QuestionType.FILL_THE_BLANK; data: FillTheBlankSolution }
    | { type: QuestionType.MATCHING; data: MatchingSolution }
    | { type: QuestionType.DESCRIPTIVE; data: DescriptiveSolution }
    | { type: QuestionType.CODING; data: CodingSolution };

/* Versioning example:
const questionData: QuestionDataPayload = {
  questionType: QuestionType.MCQ,
  data: {
    options: [
      { id: "opt1", optionText: "Paris", orderIndex: 1 },
      { id: "opt2", optionText: "London", orderIndex: 2 },
    ],
  },
};
const Question: VersionedJson<QuestionDataPayload> = {
  version: 1,
  data: questionData,
};

*/
