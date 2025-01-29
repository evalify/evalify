export interface Quiz {
    _id: string;
    title: string;
    description?: string;
    duration?: number;
    totalMarks?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface QuizQuestion {
    _id: string;
    quizId: string;
    type: 'MCQ' | 'FILL_IN_BLANK' | 'DESCRIPTIVE';
    question: string;
    options?: {
        optionId: string;
        option: string;
    }[];
    answer: string[];
    expectedAnswer?: string;
    mark: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}
