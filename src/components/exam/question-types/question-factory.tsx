"use client";

import React from "react";
import { QuizQuestion } from "../context/quiz-context";
import { MCQQuestion } from "./mcq";
import { TrueFalseQuestion } from "./true-or-false";
import { DescriptiveQuestion } from "./descriptive";
import { FillInBlankQuestion } from "./fill-in-blank";
import { MatchTheFollowingQuestion } from "./match-the-following";
import { CodingQuestion } from "./coding";
import { FileUploadQuestion } from "./file-upload";
import type { StudentAnswer } from "../lib/types";

interface QuestionFactoryProps {
    question: QuizQuestion;
    onAnswerChange: (answer: StudentAnswer) => void;
}

export function QuestionFactory({ question, onAnswerChange }: QuestionFactoryProps) {
    // Normalize question type to uppercase for consistent matching
    const questionType = question.type || "UNKNOWN";

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
        case "FILL_THE_BLANK":
            return <FillInBlankQuestion question={question} onAnswerChange={onAnswerChange} />;
        case "MATCHING":
            return (
                <MatchTheFollowingQuestion question={question} onAnswerChange={onAnswerChange} />
            );
        case "CODING":
            return <CodingQuestion question={question} onAnswerChange={onAnswerChange} />;
        case "FILE_UPLOAD":
            return <FileUploadQuestion question={question} onAnswerChange={onAnswerChange} />;
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
