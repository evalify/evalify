export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'FILL_IN_BLANK' | 'DESCRIPTIVE' | 'CODING';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface BaseQuestion {
    _id?: string;
    id?: string;
    type: QuestionType;
    content: string;
    difficulty: DifficultyLevel;
    marks: number;
    topic: string;
    bankId: string;
    topics: string[];
    explanation?: string;
}

export interface MCQQuestion extends BaseQuestion {
    type: 'MCQ';
    options: string[];
    correctOptions: number[];
}

export interface FillInBlankQuestion extends BaseQuestion {
    type: 'FILL_IN_BLANK';
    correctAnswer: string;
}

export interface DescriptiveQuestion extends BaseQuestion {
    type: 'DESCRIPTIVE';
    sampleAnswer?: string;
}

export interface CodingQuestion extends BaseQuestion {
    type: 'CODING';
    testCases?: {
        input: string;
        output: string;
    }[];
}

export type Question = MCQQuestion | FillInBlankQuestion | DescriptiveQuestion | CodingQuestion;
