export type QuestionType = "MCQ" | "TRUE_FALSE" | "FILL_IN_BLANK" | "DESCRIPTIVE" | "CODING";
export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";

interface BaseQuestion {
    _id?: string;
    id?: string;
    type: QuestionType;
    difficulty: DifficultyLevel;
    topics: string[];
    bankId: string;
    explanation: string;
    createdBy?: string;
    createdAt?: string;
    question: string;
    mark: number;
}

interface MCQOption {
    optionId: string;
    option: string;
}

export interface MCQQuestion extends BaseQuestion {
    type: "MCQ";
    options: MCQOption[];
    answer: string[];
}

export interface DescriptiveQuestion extends BaseQuestion {
    type: "DESCRIPTIVE";
    expectedAnswer: string;
    guidelines?: string;
}

export interface FillInBlankQuestion extends BaseQuestion {
    type: "FILL_IN_BLANK";
    expectedAnswer: string;
}

export type Question = MCQQuestion | DescriptiveQuestion | FillInBlankQuestion;
