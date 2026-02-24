"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { QuizQuestion } from "../context/quiz-context";
import { QuestionHeader } from "./question-header";
import type { FillInBlanksStudentAnswer, StudentFillInBlanksConfig } from "../lib/types";
import { FillInBlanksAcceptedType } from "@/types/questions";
import { debounce } from "lodash-es";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Hash, Type, CaseLower, CaseUpper, Info } from "lucide-react";

const BLANK_REGEX = /_{3,}/g;

interface FillInBlankQuestionProps {
    question: QuizQuestion;
    onAnswerChange: (answer: FillInBlanksStudentAnswer) => void;
}

function getInputMode(
    type: FillInBlanksAcceptedType
): React.HTMLAttributes<HTMLInputElement>["inputMode"] {
    return type === FillInBlanksAcceptedType.NUMBER ? "numeric" : "text";
}

function validateAndTransform(value: string, type: FillInBlanksAcceptedType): string {
    switch (type) {
        case FillInBlanksAcceptedType.NUMBER:
            return value.replace(/[^0-9.\-]/g, "");
        case FillInBlanksAcceptedType.UPPERCASE:
            return value.toUpperCase();
        case FillInBlanksAcceptedType.LOWERCASE:
            return value.toLowerCase();
        default:
            return value;
    }
}

function getTypeLabel(type: FillInBlanksAcceptedType): string {
    switch (type) {
        case FillInBlanksAcceptedType.NUMBER:
            return "Numbers only";
        case FillInBlanksAcceptedType.UPPERCASE:
            return "UPPERCASE";
        case FillInBlanksAcceptedType.LOWERCASE:
            return "lowercase";
        default:
            return "Text";
    }
}

/** Color classes for the type badge — NUMBER=blue, UPPERCASE=violet, LOWERCASE=amber */
function getTypeBadgeClass(type: FillInBlanksAcceptedType): string {
    switch (type) {
        case FillInBlanksAcceptedType.NUMBER:
            return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
        case FillInBlanksAcceptedType.UPPERCASE:
            return "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300";
        case FillInBlanksAcceptedType.LOWERCASE:
            return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
        default:
            return "";
    }
}

/** Icon for each blank type */
function getTypeIcon(type: FillInBlanksAcceptedType) {
    switch (type) {
        case FillInBlanksAcceptedType.NUMBER:
            return <Hash className="h-3.5 w-3.5" />;
        case FillInBlanksAcceptedType.UPPERCASE:
            return <CaseUpper className="h-3.5 w-3.5" />;
        case FillInBlanksAcceptedType.LOWERCASE:
            return <CaseLower className="h-3.5 w-3.5" />;
        default:
            return <Type className="h-3.5 w-3.5" />;
    }
}

/** A friendly description for the type hint */
function getTypeDescription(type: FillInBlanksAcceptedType): string {
    switch (type) {
        case FillInBlanksAcceptedType.NUMBER:
            return "Enter a numeric value (integers or decimals)";
        case FillInBlanksAcceptedType.UPPERCASE:
            return "Answer will be auto-converted to UPPERCASE";
        case FillInBlanksAcceptedType.LOWERCASE:
            return "Answer will be auto-converted to lowercase";
        default:
            return "Enter any text value";
    }
}

/**
 * Info panel showing the expected type for each blank.
 * Always rendered so the space below the question is filled with
 * useful guidance — even when all blanks are plain TEXT.
 */
function BlankTypeHints({
    blankCount,
    blankTypes,
}: {
    blankCount: number;
    blankTypes: Record<number, FillInBlanksAcceptedType>;
}) {
    if (blankCount === 0) return null;

    return (
        <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 px-4 py-3 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                <span>Expected answer formats</span>
            </div>

            <div className="flex flex-wrap gap-2">
                {Array.from({ length: blankCount }, (_, i) => {
                    const type = blankTypes[i] || FillInBlanksAcceptedType.TEXT;
                    const isSpecial = type !== FillInBlanksAcceptedType.TEXT;
                    return (
                        <Tooltip key={i}>
                            <TooltipTrigger asChild>
                                <div
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5",
                                        "text-xs font-medium transition-colors",
                                        "border",
                                        isSpecial
                                            ? getTypeBadgeClass(type)
                                            : "bg-muted/50 text-muted-foreground border-muted-foreground/15"
                                    )}
                                >
                                    {getTypeIcon(type)}
                                    <span>
                                        Blank {i + 1}:{" "}
                                        <span className="font-semibold">{getTypeLabel(type)}</span>
                                    </span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-52">
                                {getTypeDescription(type)}
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
}

interface InlineBlankInputProps {
    blankIndex: number;
    value: string;
    type: FillInBlanksAcceptedType;
    questionId: string;
    onChange: (blankIndex: number, value: string) => void;
}

/**
 * Renders a single inline fill-in-the-blank input.
 * Styling: underline-only field that feels like a hand-written blank rather than a form box.
 * TooltipProvider must be an ancestor (provided by the parent FillInBlankQuestion).
 */
function InlineBlankInput({
    blankIndex,
    value,
    type,
    questionId,
    onChange,
}: InlineBlankInputProps) {
    const showTypeBadge = type !== FillInBlanksAcceptedType.TEXT;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const transformed = validateAndTransform(e.target.value, type);
        onChange(blankIndex, transformed);
    };

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="inline-flex flex-col items-center mx-1.5 align-bottom">
                    {showTypeBadge && (
                        <span
                            className={cn(
                                "text-[9px] font-semibold leading-none mb-0.5 px-1 rounded-sm",
                                getTypeBadgeClass(type)
                            )}
                        >
                            {getTypeLabel(type)}
                        </span>
                    )}
                    <input
                        id={`blank-${questionId}-${blankIndex}`}
                        type="text"
                        inputMode={getInputMode(type)}
                        placeholder={`blank ${blankIndex + 1}`}
                        value={value}
                        onChange={handleChange}
                        style={{ width: `max(7rem, ${value.length + 2}ch)` }}
                        className={cn(
                            // Underline-style: no surrounding border, just a bottom line
                            "inline-block text-sm bg-transparent text-center",
                            "border-0 border-b-2 rounded-none px-1 py-0",
                            "text-foreground placeholder:text-muted-foreground/40",
                            "focus:outline-none focus:border-primary transition-colors",
                            value
                                ? "border-foreground/40"
                                : "border-dashed border-muted-foreground/40"
                        )}
                        autoComplete="off"
                    />
                </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
                Blank {blankIndex + 1}
                {showTypeBadge ? ` — ${getTypeLabel(type)}` : ""}
            </TooltipContent>
        </Tooltip>
    );
}

export function FillInBlankQuestion({ question, onAnswerChange }: FillInBlankQuestionProps) {
    const blankConfig = question.blankConfig as StudentFillInBlanksConfig | undefined;
    const blankCount = blankConfig?.blankCount || 1;
    const blankTypes = blankConfig?.blankTypes || {};

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

    // Split the question HTML on blank markers (___) to interleave inline inputs
    const questionSegments = useMemo(() => {
        const html = (question.question as string) || "";
        return html.split(BLANK_REGEX);
    }, [question.question]);

    const detectedBlanks = useMemo(() => {
        const html = (question.question as string) || "";
        const matches = html.match(BLANK_REGEX);
        return matches ? matches.length : 0;
    }, [question.question]);

    const hasInlineBlanks = detectedBlanks > 0;

    return (
        <TooltipProvider delayDuration={0}>
            <div className="space-y-6">
                <QuestionHeader question={question} />

                {hasInlineBlanks ? (
                    /* ── Inline mode: inputs appear in-line within the question text ── */
                    <div className="leading-loose text-sm text-foreground">
                        {questionSegments.map((segment, i) => (
                            <React.Fragment key={i}>
                                <span
                                    className="prose prose-sm dark:prose-invert *:inline"
                                    dangerouslySetInnerHTML={{ __html: segment }}
                                />
                                {i < questionSegments.length - 1 && (
                                    <InlineBlankInput
                                        blankIndex={i}
                                        value={localAnswers[i.toString()] || ""}
                                        type={blankTypes[i] || FillInBlanksAcceptedType.TEXT}
                                        questionId={question.id}
                                        onChange={handleBlankChange}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                ) : (
                    /* ── Standalone mode: question text shown, blanks listed below ── */
                    <>
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                            <span
                                dangerouslySetInnerHTML={{
                                    __html: (question.question as string) || "",
                                }}
                            />
                        </div>
                        <div className="space-y-3">
                            {Array.from({ length: blankCount }, (_, i) => {
                                const key = i.toString();
                                const type = blankTypes[i] || FillInBlanksAcceptedType.TEXT;
                                const showBadge = type !== FillInBlanksAcceptedType.TEXT;
                                return (
                                    <div key={key} className="flex items-center gap-3">
                                        <span className="shrink-0 text-xs font-semibold text-muted-foreground w-14">
                                            Blank {i + 1}
                                        </span>
                                        <input
                                            id={`blank-${question.id}-${key}`}
                                            type="text"
                                            inputMode={getInputMode(type)}
                                            placeholder={`Type your answer…`}
                                            value={localAnswers[key] || ""}
                                            onChange={(e) => {
                                                const transformed = validateAndTransform(
                                                    e.target.value,
                                                    type
                                                );
                                                handleBlankChange(i, transformed);
                                            }}
                                            style={{
                                                width: `max(7rem, ${(localAnswers[key]?.length || 0) + 2}ch)`,
                                            }}
                                            className={cn(
                                                "flex-1 px-0 py-1 text-sm bg-transparent",
                                                "border-0 border-b-2 rounded-none",
                                                "text-foreground placeholder:text-muted-foreground/40",
                                                "focus:outline-none focus:border-primary transition-colors",
                                                localAnswers[key]
                                                    ? "border-foreground/40"
                                                    : "border-dashed border-muted-foreground/40"
                                            )}
                                            autoComplete="off"
                                        />
                                        {showBadge && (
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "shrink-0 text-[10px] px-1.5 py-0",
                                                    getTypeBadgeClass(type)
                                                )}
                                            >
                                                {getTypeLabel(type)}
                                            </Badge>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* ── Type hints panel — fills blank space with useful format info ── */}
                <BlankTypeHints
                    blankCount={hasInlineBlanks ? detectedBlanks : blankCount}
                    blankTypes={blankTypes}
                />
            </div>
        </TooltipProvider>
    );
}
