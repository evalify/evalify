import {
    QuestionType,
    Question,
    BloomsLevel,
    Difficulty,
    FillInBlanksEvaluationType,
} from "@/types/questions";
import type { ComponentType } from "react";
import MCQComponent from "./create-edit/mcq";
import FillInBlanksComponent from "./create-edit/fill-in-blanks";
import TrueFalseComponent from "./create-edit/true-false";
import DescriptiveComponent from "./create-edit/descriptive";
import MatchTheFollowingComponent from "./create-edit/match-the-following";

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
        case QuestionType.FILL_THE_BLANK:
            return FillInBlanksComponent as ComponentType<QuestionComponentProps<Question>>;
        case QuestionType.TRUE_FALSE:
            return TrueFalseComponent as ComponentType<QuestionComponentProps<Question>>;
        case QuestionType.DESCRIPTIVE:
            return DescriptiveComponent as ComponentType<QuestionComponentProps<Question>>;
        case QuestionType.MATCHING:
            return MatchTheFollowingComponent as ComponentType<QuestionComponentProps<Question>>;
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
        case QuestionType.FILL_THE_BLANK:
            return {
                ...baseQuestion,
                type: QuestionType.FILL_THE_BLANK,
                blankConfig: {
                    blankCount: 0,
                    acceptableAnswers: {},
                    blankWeights: {},
                    evaluationType: FillInBlanksEvaluationType.NORMAL,
                },
            };
        case QuestionType.TRUE_FALSE:
            return {
                ...baseQuestion,
                type: QuestionType.TRUE_FALSE,
                trueFalseAnswer: undefined,
            };
        case QuestionType.DESCRIPTIVE:
            return {
                ...baseQuestion,
                type: QuestionType.DESCRIPTIVE,
                descriptiveConfig: {
                    modelAnswer: "",
                    keywords: [],
                    minWords: undefined,
                    maxWords: undefined,
                },
            };
        case QuestionType.MATCHING:
            return {
                ...baseQuestion,
                type: QuestionType.MATCHING,
                options: [],
            };
        default:
            throw new Error(`Unsupported question type: ${questionType}`);
    }
}
