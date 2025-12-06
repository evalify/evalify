"use client";

import React, { useState, useEffect, useRef } from "react";
import { QuizQuestion } from "../context/quiz-context";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ContentPreview } from "@/components/rich-text-editor/content-preview";
import { QuestionHeader } from "./question-header";
import type { DescriptiveStudentAnswer } from "../lib/types";
import { debounce } from "lodash-es";

interface DescriptiveQuestionProps {
    question: QuizQuestion;
    onAnswerChange: (answer: DescriptiveStudentAnswer) => void;
}

export function DescriptiveQuestion({ question, onAnswerChange }: DescriptiveQuestionProps) {
    const savedAnswer =
        (question.response as DescriptiveStudentAnswer | undefined)?.studentAnswer || "";

    // Use key to force remount when question changes, resetting local state
    // This is better than setState in useEffect
    const [localValue, setLocalValue] = useState(() => savedAnswer);

    // Create a stable debounced function
    const debouncedSaveRef = useRef(
        debounce((value: string) => {
            const answer: DescriptiveStudentAnswer = { studentAnswer: value };
            onAnswerChange(answer);
        }, 500)
    );

    // Update local value when saved answer changes from external source
    useEffect(() => {
        if (savedAnswer !== localValue) {
            setLocalValue(savedAnswer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedAnswer, question.id]);

    // Cleanup debounce on unmount
    useEffect(() => {
        const debouncedFn = debouncedSaveRef.current;
        return () => {
            debouncedFn.cancel();
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        // Update local state immediately for responsive UI
        setLocalValue(newValue);
        // Debounced save will handle persistence
        debouncedSaveRef.current(newValue);
    };

    return (
        <div className="space-y-6">
            {/* Question metadata header */}
            <QuestionHeader question={question} />

            {/* Question content */}
            <div className="prose prose-sm max-w-none dark:prose-invert">
                <ContentPreview content={(question.question as string) || ""} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="answer">Your Answer</Label>
                <Textarea
                    id="answer"
                    placeholder="Type your answer here..."
                    value={localValue}
                    onChange={handleChange}
                    className="min-h-[150px]"
                />
            </div>
        </div>
    );
}
