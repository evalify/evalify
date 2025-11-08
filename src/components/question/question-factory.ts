import { QuestionType, Question, BloomsLevel, Difficulty } from "@/types/questions";
import type { ComponentType } from "react";
import MCQComponent from "./create-edit/mcq";

export interface QuestionComponentProps<T extends Question = Question> {
    value: T;
    onChange: (question: T) => void;
}

export function getQuestionComponent(
    questionType: QuestionType
): ComponentType<QuestionComponentProps<Question>> {
    switch (questionType) {
        case QuestionType.MCQ:
        case QuestionType.MMCQ:
            return MCQComponent as ComponentType<QuestionComponentProps<Question>>;
        // Add other question type components as they are implemented
        default:
            throw new Error(`Unsupported question type: ${questionType}`);
    }
}

export function createDefaultQuestion(questionType: QuestionType): Question {
    const baseQuestion = {
        type: questionType,
        question: "",
        explanation: "",
        marks: 1,
        negativeMarks: 0,
        topics: [],
        bloomsLevel: BloomsLevel.UNDERSTAND,
        difficulty: Difficulty.MEDIUM,
    };

    switch (questionType) {
        case QuestionType.MCQ:
            return {
                ...baseQuestion,
                type: QuestionType.MCQ,
                questionData: {
                    options: [],
                },
                solution: {
                    correctOptions: [],
                },
            };
        case QuestionType.MMCQ:
            return {
                ...baseQuestion,
                type: QuestionType.MMCQ,
                questionData: {
                    options: [],
                },
                solution: {
                    correctOptions: [],
                },
            };
        default:
            throw new Error(`Unsupported question type: ${questionType}`);
    }
}
