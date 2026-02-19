"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { QuizQuestion } from "../context/quiz-context";
import { ContentPreview } from "@/components/rich-text-editor/content-preview";
import { QuestionHeader } from "./question-header";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, ArrowRight } from "lucide-react";
import type { MatchingStudentAnswer } from "../lib/types";
import type { MatchOptions } from "@/types/questions";

interface MatchTheFollowingQuestionProps {
    question: QuizQuestion;
    onAnswerChange: (answer: MatchingStudentAnswer) => void;
}

export function MatchTheFollowingQuestion({
    question,
    onAnswerChange,
}: MatchTheFollowingQuestionProps) {
    const allOptions = useMemo<MatchOptions[]>(() => question.options || [], [question.options]);

    const leftOptions = useMemo(
        () =>
            allOptions
                .filter((opt) => opt.isLeft)
                .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
        [allOptions]
    );

    const rightOptions = useMemo(
        () =>
            allOptions
                .filter((opt) => !opt.isLeft)
                .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
        [allOptions]
    );

    const savedMatches =
        (question.response as MatchingStudentAnswer | undefined)?.studentAnswer || {};

    const [matches, setMatches] = useState<Record<string, string>>(() => savedMatches);
    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

    useEffect(() => {
        setMatches(savedMatches);
        setSelectedLeft(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [question.id]);

    const saveMatches = useCallback(
        (newMatches: Record<string, string>) => {
            onAnswerChange({ studentAnswer: newMatches });
        },
        [onAnswerChange]
    );

    const handleLeftClick = (leftId: string) => {
        setSelectedLeft((prev) => (prev === leftId ? null : leftId));
    };

    const handleRightClick = (rightId: string) => {
        if (!selectedLeft) return;

        const existingLeftForRight = Object.entries(matches).find(
            ([, rId]) => rId === rightId
        )?.[0];

        const newMatches = { ...matches };

        if (existingLeftForRight) {
            delete newMatches[existingLeftForRight];
        }

        if (newMatches[selectedLeft]) {
            delete newMatches[selectedLeft];
        }

        newMatches[selectedLeft] = rightId;

        setMatches(newMatches);
        saveMatches(newMatches);
        setSelectedLeft(null);
    };

    const handleRemoveMatch = (leftId: string) => {
        const newMatches = { ...matches };
        delete newMatches[leftId];
        setMatches(newMatches);
        saveMatches(newMatches);
    };

    const getRightMatchedLeft = (rightId: string): string | null => {
        const entry = Object.entries(matches).find(([, rId]) => rId === rightId);
        return entry ? entry[0] : null;
    };

    const getMatchedRightText = (leftId: string): string | null => {
        const rightId = matches[leftId];
        if (!rightId) return null;
        return rightOptions.find((r) => r.id === rightId)?.text || null;
    };

    return (
        <div className="space-y-6">
            <QuestionHeader question={question} />

            <div className="prose prose-sm max-w-none dark:prose-invert">
                <ContentPreview content={(question.question as string) || ""} />
            </div>

            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                Click on an item from the left column, then click on the matching item from the
                right column to create a match. Click on a matched pair to remove it.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Column A</h4>
                    {leftOptions.map((option, index) => {
                        const isSelected = selectedLeft === option.id;
                        const isMatched = !!matches[option.id];
                        const matchedText = getMatchedRightText(option.id);

                        return (
                            <div key={option.id} className="space-y-1">
                                <div
                                    className={cn(
                                        "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                                        isSelected
                                            ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                                            : isMatched
                                              ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                                              : "border-input hover:bg-muted/50"
                                    )}
                                    onClick={() => handleLeftClick(option.id)}
                                >
                                    <span className="shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                        {index + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <ContentPreview
                                            content={option.text}
                                            noProse
                                            className="p-0 border-0"
                                        />
                                    </div>
                                </div>
                                {isMatched && matchedText && (
                                    <div className="flex items-center gap-2 ml-9 text-sm text-green-600 dark:text-green-400">
                                        <ArrowRight className="h-3 w-3" />
                                        <span className="truncate">{matchedText}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0 ml-auto"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveMatch(option.id);
                                            }}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Column B</h4>
                    {rightOptions.map((option, index) => {
                        const matchedLeftId = getRightMatchedLeft(option.id);
                        const isMatched = !!matchedLeftId;
                        const isSelectable = selectedLeft !== null;

                        return (
                            <div
                                key={option.id}
                                className={cn(
                                    "flex items-start gap-3 p-3 rounded-lg border transition-all",
                                    isMatched
                                        ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                                        : isSelectable
                                          ? "border-input hover:bg-primary/5 hover:border-primary cursor-pointer"
                                          : "border-input"
                                )}
                                onClick={() => isSelectable && handleRightClick(option.id)}
                            >
                                <span className="shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                    {String.fromCharCode(65 + index)}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <ContentPreview
                                        content={option.text}
                                        noProse
                                        className="p-0 border-0"
                                    />
                                </div>
                                {isMatched && (
                                    <span className="text-xs text-green-600 dark:text-green-400 shrink-0">
                                        Matched
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="text-sm text-muted-foreground">
                Matched: {Object.keys(matches).length} / {leftOptions.length}
            </div>
        </div>
    );
}
