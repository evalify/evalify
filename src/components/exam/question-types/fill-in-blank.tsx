"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { QuizQuestion } from "../context/quiz-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContentPreview } from "@/components/rich-text-editor/content-preview";
import { QuestionHeader } from "./question-header";
import type { FillInBlanksStudentAnswer, StudentFillInBlanksConfig } from "../lib/types";
import { debounce } from "lodash-es";

interface FillInBlankQuestionProps {
    question: QuizQuestion;
    onAnswerChange: (answer: FillInBlanksStudentAnswer) => void;
}

export function FillInBlankQuestion({ question, onAnswerChange }: FillInBlankQuestionProps) {
    const blankConfig = question.blankConfig as StudentFillInBlanksConfig | undefined;
    const blankCount = blankConfig?.blankCount || 1;

    const savedAnswer =
        (question.response as FillInBlanksStudentAnswer | undefined)?.studentAnswer || {};

    const [localAnswers, setLocalAnswers] = useState<Record<string, string>>(() => savedAnswer);

    const debouncedSaveRef = useRef(
        debounce((answers: Record<string, string>) => {
            onAnswerChange({ studentAnswer: answers });
        }, 500)
    );

    useEffect(() => {
        setLocalAnswers(savedAnswer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [question.id]);

    useEffect(() => {
        const debouncedFn = debouncedSaveRef.current;
        return () => {
            debouncedFn.cancel();
        };
    }, []);

    const handleBlankChange = useCallback((blankIndex: number, value: string) => {
        setLocalAnswers((prev) => {
            const newAnswers = { ...prev, [blankIndex.toString()]: value };
            debouncedSaveRef.current(newAnswers);
            return newAnswers;
        });
    }, []);

    const blanks = useMemo(() => {
        return Array.from({ length: blankCount }, (_, i) => i);
    }, [blankCount]);

    return (
        <div className="space-y-6">
            <QuestionHeader question={question} />

            <div className="prose prose-sm max-w-none dark:prose-invert">
                <ContentPreview content={(question.question as string) || ""} />
            </div>

            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                Fill in the {blankCount} blank{blankCount > 1 ? "s" : ""} below. The blanks are
                numbered in the order they appear in the question.
            </div>

            <div className="space-y-4">
                {blanks.map((i) => {
                    const key = i.toString();
                    return (
                        <div key={key} className="space-y-2">
                            <Label
                                htmlFor={`blank-${question.id}-${key}`}
                                className="text-sm font-medium"
                            >
                                Blank {i + 1}
                            </Label>
                            <Input
                                id={`blank-${question.id}-${key}`}
                                placeholder={`Enter answer for blank ${i + 1}`}
                                value={localAnswers[key] || ""}
                                onChange={(e) => handleBlankChange(i, e.target.value)}
                                className="max-w-md"
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
