"use client";

import React from "react";
import { QuizQuestion } from "../context/quiz-context";
import { MCQQuestion } from "./mcq";
import { TrueFalseQuestion } from "./true-or-false";
import { DescriptiveQuestion } from "./descriptive";
import type { StudentAnswer } from "../lib/types";

interface QuestionFactoryProps {
    question: QuizQuestion;
    onAnswerChange: (answer: StudentAnswer) => void;
}

export function QuestionFactory({ question, onAnswerChange }: QuestionFactoryProps) {
    // Normalize question type to uppercase for consistent matching
    const questionType = question.type?.toUpperCase() || "UNKNOWN";

    switch (questionType) {
        case "MCQ":
            return (
                <MCQQuestion question={question} onAnswerChange={onAnswerChange} isMMCQ={false} />
            );
        case "MMCQ":
            return (
                <MCQQuestion question={question} onAnswerChange={onAnswerChange} isMMCQ={true} />
            );
        case "TRUE_FALSE":
            return <TrueFalseQuestion question={question} onAnswerChange={onAnswerChange} />;
        case "DESCRIPTIVE":
            return <DescriptiveQuestion question={question} onAnswerChange={onAnswerChange} />;
        default:
            return (
                <div className="p-4 border rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">
                        Unsupported question type: {questionType}
                    </p>
                    <pre className="mt-2 text-xs overflow-auto p-2 bg-background rounded border">
                        {JSON.stringify(question, null, 2)}
                    </pre>
                </div>
            );
    }
}
