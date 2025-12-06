"use client";

import React, { useState, useEffect, useCallback } from "react";
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
    // Extract options from question
    const allOptions: MatchOptions[] = question.options || [];

    // Separate left and right options
    const leftOptions = allOptions
        .filter((opt) => opt.isLeft)
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

    const rightOptions = allOptions
        .filter((opt) => !opt.isLeft)
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

    // Get saved matches
    const savedMatches =
        (question.response as MatchingStudentAnswer | undefined)?.studentAnswer || {};

    // Local state for matches: { leftId: rightId }
    const [matches, setMatches] = useState<Record<string, string>>(() => savedMatches);

    // Selected left item for matching
    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

    // Update local state when saved answer changes
    useEffect(() => {
        setMatches(savedMatches);
        setSelectedLeft(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [question.id]);

    // Save matches to parent
    const saveMatches = useCallback(
        (newMatches: Record<string, string>) => {
            const answer: MatchingStudentAnswer = { studentAnswer: newMatches };
            onAnswerChange(answer);
        },
        [onAnswerChange]
    );

    // Handle left item click
    const handleLeftClick = (leftId: string) => {
        if (selectedLeft === leftId) {
            setSelectedLeft(null);
        } else {
            setSelectedLeft(leftId);
        }
    };

    // Handle right item click (to create match)
    const handleRightClick = (rightId: string) => {
        if (!selectedLeft) return;

        // Check if this right option is already matched to another left
        const existingLeftForRight = Object.entries(matches).find(
            ([, rId]) => rId === rightId
        )?.[0];

        const newMatches = { ...matches };

        // Remove existing match for this right option if any
        if (existingLeftForRight) {
            delete newMatches[existingLeftForRight];
        }

        // Remove existing match for the selected left if any
        if (newMatches[selectedLeft]) {
            delete newMatches[selectedLeft];
        }

        // Create new match
        newMatches[selectedLeft] = rightId;

        setMatches(newMatches);
        saveMatches(newMatches);
        setSelectedLeft(null);
    };

    // Remove a match
    const handleRemoveMatch = (leftId: string) => {
        const newMatches = { ...matches };
        delete newMatches[leftId];
        setMatches(newMatches);
        saveMatches(newMatches);
    };

    // Check if a right option is matched
    const getRightMatchedLeft = (rightId: string): string | null => {
        const entry = Object.entries(matches).find(([, rId]) => rId === rightId);
        return entry ? entry[0] : null;
    };

    // Get the matched right option text for a left option
    const getMatchedRightText = (leftId: string): string | null => {
        const rightId = matches[leftId];
        if (!rightId) return null;
        const rightOpt = rightOptions.find((r) => r.id === rightId);
        return rightOpt?.text || null;
    };

    return (
        <div className="space-y-6">
            {/* Question metadata header */}
            <QuestionHeader question={question} />

            {/* Question content */}
            <div className="prose prose-sm max-w-none dark:prose-invert">
                <ContentPreview content={(question.question as string) || ""} />
            </div>

            {/* Instructions */}
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                Click on an item from the left column, then click on the matching item from the
                right column to create a match. Click on a matched pair to remove it.
            </div>

            {/* Matching interface */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column */}
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
                                {/* Show match indicator */}
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

                {/* Right column */}
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

            {/* Summary */}
            <div className="text-sm text-muted-foreground">
                Matched: {Object.keys(matches).length} / {leftOptions.length}
            </div>
        </div>
    );
}
