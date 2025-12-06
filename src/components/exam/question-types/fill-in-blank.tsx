"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { QuizQuestion } from "../context/quiz-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContentPreview } from "@/components/rich-text-editor/content-preview";
import { QuestionHeader } from "./question-header";
import type { FillInBlanksStudentAnswer } from "../lib/types";
import { debounce } from "lodash-es";

interface FillInBlankQuestionProps {
    question: QuizQuestion;
    onAnswerChange: (answer: FillInBlanksStudentAnswer) => void;
}

export function FillInBlankQuestion({ question, onAnswerChange }: FillInBlankQuestionProps) {
    const blankConfig = question.blankConfig;
    const blankCount = blankConfig?.blankCount || 1;

    // Get saved answers
    const savedAnswer =
        (question.response as FillInBlanksStudentAnswer | undefined)?.studentAnswer || {};

    // Local state for immediate UI updates
    const [localAnswers, setLocalAnswers] = useState<Record<string, string>>(() => savedAnswer);

    // Create a stable debounced save function
    const debouncedSaveRef = useRef(
        debounce((answers: Record<string, string>) => {
            const answer: FillInBlanksStudentAnswer = { studentAnswer: answers };
            onAnswerChange(answer);
        }, 500)
    );

    // Update local state when saved answer changes from external source
    useEffect(() => {
        setLocalAnswers(savedAnswer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [question.id]);

    // Cleanup debounce on unmount
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

    // Generate blank inputs based on blankCount
    const renderBlanks = () => {
        const blanks = [];
        for (let i = 0; i < blankCount; i++) {
            const blankKey = i.toString();
            blanks.push(
                <div key={blankKey} className="space-y-2">
                    <Label htmlFor={`blank-${blankKey}`} className="text-sm font-medium">
                        Blank {i + 1}
                    </Label>
                    <Input
                        id={`blank-${blankKey}`}
                        placeholder={`Enter answer for blank ${i + 1}`}
                        value={localAnswers[blankKey] || ""}
                        onChange={(e) => handleBlankChange(i, e.target.value)}
                        className="max-w-md"
                    />
                </div>
            );
        }
        return blanks;
    };

    return (
        <div className="space-y-6">
            {/* Question metadata header */}
            <QuestionHeader question={question} />

            {/* Question content with blanks indicated */}
            <div className="prose prose-sm max-w-none dark:prose-invert">
                <ContentPreview content={(question.question as string) || ""} />
            </div>

            {/* Instructions */}
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                Fill in the {blankCount} blank{blankCount > 1 ? "s" : ""} below. The blanks are
                numbered in the order they appear in the question.
            </div>

            {/* Blank inputs */}
            <div className="space-y-4">{renderBlanks()}</div>
        </div>
    );
}
