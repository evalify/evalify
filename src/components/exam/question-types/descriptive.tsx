"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { QuizQuestion } from "../context/quiz-context";
import { Badge } from "@/components/ui/badge";
import { ContentPreview } from "@/components/rich-text-editor/content-preview";
import { TiptapEditor } from "@/components/rich-text-editor/editor";
import { QuestionHeader } from "./question-header";
import type { DescriptiveStudentAnswer } from "../lib/types";
import type { StudentDescriptiveConfig } from "../lib/types";
import { debounce } from "lodash-es";

interface DescriptiveQuestionProps {
    question: QuizQuestion;
    onAnswerChange: (answer: DescriptiveStudentAnswer) => void;
}

function countWords(html: string): number {
    const text = html.replace(/<[^>]*>/g, " ").trim();
    return text === "" ? 0 : text.split(/\s+/).length;
}

export function DescriptiveQuestion({ question, onAnswerChange }: DescriptiveQuestionProps) {
    const config = question.descriptiveConfig as StudentDescriptiveConfig | undefined;
    const savedAnswer =
        (question.response as DescriptiveStudentAnswer | undefined)?.studentAnswer || "";

    const [localValue, setLocalValue] = useState(() => savedAnswer);

    const debouncedSaveRef = useRef(
        debounce((value: string) => {
            onAnswerChange({ studentAnswer: value });
        }, 500)
    );

    useEffect(() => {
        if (savedAnswer !== localValue) {
            setLocalValue(savedAnswer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedAnswer, question.id]);

    useEffect(() => {
        const debouncedFn = debouncedSaveRef.current;
        return () => {
            debouncedFn.cancel();
        };
    }, []);

    const handleUpdate = useCallback((html: string) => {
        setLocalValue(html);
        debouncedSaveRef.current(html);
    }, []);

    const wordCount = useMemo(() => countWords(localValue), [localValue]);

    const wordLimitExceeded = config?.maxWords ? wordCount > config.maxWords : false;
    const wordLimitLow = config?.minWords ? wordCount < config.minWords : false;

    return (
        <div className="space-y-6">
            <QuestionHeader question={question} />

            <div className="prose prose-sm max-w-none dark:prose-invert">
                <ContentPreview content={(question.question as string) || ""} />
            </div>

            {(config?.minWords || config?.maxWords) && (
                <div className="flex flex-wrap gap-2">
                    {config.minWords && (
                        <Badge variant="outline" className="text-xs">
                            Min: {config.minWords} words
                        </Badge>
                    )}
                    {config.maxWords && (
                        <Badge variant="outline" className="text-xs">
                            Max: {config.maxWords} words
                        </Badge>
                    )}
                </div>
            )}

            <div className="space-y-2">
                <TiptapEditor
                    key={question.id}
                    initialContent={savedAnswer}
                    onUpdate={handleUpdate}
                    height="200px"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span
                        className={
                            wordLimitExceeded
                                ? "text-destructive font-medium"
                                : wordLimitLow && wordCount > 0
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : ""
                        }
                    >
                        {wordCount} word{wordCount !== 1 ? "s" : ""}
                    </span>
                    {wordLimitExceeded && (
                        <span className="text-destructive">Word limit exceeded</span>
                    )}
                    {wordLimitLow && wordCount > 0 && (
                        <span className="text-yellow-600 dark:text-yellow-400">
                            Below minimum word count
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
