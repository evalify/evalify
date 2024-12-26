export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'FILL_IN_BLANK' | 'DESCRIPTIVE' | 'CODING';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface BaseQuestion {
    _id?: string;    // MongoDB's _id
    id?: string;     // Keep old id for compatibility
    type: QuestionType;
    content: string;
    difficulty: DifficultyLevel;
    marks: number;
    topic: string;
    bankId: string;
    topics: string[];   // Allow multiple topics
    explanation?: string; // Add optional explanation field
}

export interface MCQQuestion extends BaseQuestion {
    type: 'MCQ';
    options: string[];
    correctOptions: number[]; // Changed from correctOption to correctOptions array
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
