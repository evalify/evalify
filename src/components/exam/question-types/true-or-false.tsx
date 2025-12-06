"use client";

import React from "react";
import { QuizQuestion } from "../context/quiz-context";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ContentPreview } from "@/components/rich-text-editor/content-preview";
import { QuestionHeader } from "./question-header";
import type { TrueFalseStudentAnswer } from "../lib/types";

interface TrueFalseQuestionProps {
    question: QuizQuestion;
    onAnswerChange: (answer: TrueFalseStudentAnswer) => void;
}

export function TrueFalseQuestion({ question, onAnswerChange }: TrueFalseQuestionProps) {
    const currentAnswer =
        (question.response as TrueFalseStudentAnswer | undefined)?.studentAnswer || "";
    const options = ["True", "False"];

    const handleValueChange = (value: string) => {
        const answer: TrueFalseStudentAnswer = { studentAnswer: value };
        onAnswerChange(answer);
    };

    return (
        <div className="space-y-6">
            {/* Question metadata header */}
            <QuestionHeader question={question} />

            {/* Question content */}
            <div className="prose prose-sm max-w-none dark:prose-invert">
                <ContentPreview content={(question.question as string) || ""} />
            </div>

            {/* Options - RadioGroup wraps all items */}
            <RadioGroup
                value={currentAnswer}
                onValueChange={handleValueChange}
                className="grid grid-cols-2 gap-4"
            >
                {options.map((option) => (
                    <Label
                        key={option}
                        htmlFor={`tf-option-${question.id}-${option}`}
                        className={cn(
                            "flex items-center justify-center p-6 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50",
                            currentAnswer === option
                                ? "border-primary bg-primary/5"
                                : "border-input"
                        )}
                    >
                        <RadioGroupItem
                            value={option}
                            id={`tf-option-${question.id}-${option}`}
                            className="sr-only"
                        />
                        <span className="text-lg font-medium">{option}</span>
                    </Label>
                ))}
            </RadioGroup>
        </div>
    );
}
