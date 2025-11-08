export interface QuizQuestion {
    id: string;
    quizId: string;
    questionId: string;
    sectionId: string | null;
    orderIndex: number;
    createdAt: Date;
    updatedAt?: Date;
}
