"use client";

import { QuizQuestion } from "../context/quiz-context";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ContentPreview } from "@/components/rich-text-editor/content-preview";
import { QuestionHeader } from "./question-header";
import type { MCQStudentAnswer, MMCQStudentAnswer } from "../lib/types";

/** Option structure for MCQ/MMCQ questions */
interface MCQOption {
    id: string;
    optionText: string;
    orderIndex?: number;
}

/** Extended question data that may have nested structure */
interface ExtendedMCQData {
    options?: MCQOption[];
    data?: {
        options?: MCQOption[];
    };
}

interface MCQQuestionProps {
    question: QuizQuestion;
    onAnswerChange: (answer: MCQStudentAnswer | MMCQStudentAnswer) => void;
    isMMCQ?: boolean;
}

export function MCQQuestion({ question, onAnswerChange, isMMCQ = false }: MCQQuestionProps) {
    // Extract options from questionData - handle various nested structures
    const mcqData = question.questionData as ExtendedMCQData | undefined;

    // Try multiple possible locations for options
    let rawOptions: MCQOption[] = [];

    if (mcqData?.options && Array.isArray(mcqData.options)) {
        rawOptions = mcqData.options;
    } else if (mcqData?.data?.options && Array.isArray(mcqData.data.options)) {
        // Handle nested { data: { options: [] } } structure
        rawOptions = mcqData.data.options;
    } else if ((question as QuizQuestion & { options?: MCQOption[] }).options) {
        // Options might be directly on question
        rawOptions = (question as QuizQuestion & { options: MCQOption[] }).options;
    }

    // Sort options by orderIndex if available
    const options = [...rawOptions].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

    // Handle current answer - properly typed based on question type
    const currentAnswer = isMMCQ
        ? ((question.response as MMCQStudentAnswer | undefined)?.studentAnswer ?? [])
        : ((question.response as MCQStudentAnswer | undefined)?.studentAnswer ?? "");

    const handleSingleSelect = (value: string) => {
        const answer: MCQStudentAnswer = { studentAnswer: value };
        onAnswerChange(answer);
    };

    const handleMultiSelect = (optionId: string, checked: boolean) => {
        const currentSelected = Array.isArray(currentAnswer) ? currentAnswer : [];
        let newSelected: string[];

        if (checked) {
            newSelected = [...currentSelected, optionId];
        } else {
            newSelected = currentSelected.filter((id) => id !== optionId);
        }

        const answer: MMCQStudentAnswer = { studentAnswer: newSelected };
        onAnswerChange(answer);
    };

    const isSelected = (optionId: string): boolean => {
        if (isMMCQ) {
            return Array.isArray(currentAnswer) && currentAnswer.includes(optionId);
        }
        return currentAnswer === optionId;
    };

    // Debug: if no options found, show helpful message
    if (options.length === 0) {
        return (
            <div className="space-y-6">
                <QuestionHeader question={question} />
                <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ContentPreview content={(question.question as string) || ""} />
                </div>
                <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
                    <p className="text-sm font-medium">No options available for this question.</p>
                    <details className="mt-2">
                        <summary className="text-xs cursor-pointer">Debug Info</summary>
                        <pre className="mt-2 text-xs overflow-auto p-2 bg-background rounded border">
                            {JSON.stringify({ questionData: question.questionData }, null, 2)}
                        </pre>
                    </details>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Question metadata header */}
            <QuestionHeader question={question} />

            {/* Question content */}
            <div className="prose prose-sm max-w-none dark:prose-invert">
                <ContentPreview content={(question.question as string) || ""} />
            </div>

            {/* Options */}
            {isMMCQ ? (
                // MMCQ: Multiple selection with checkboxes
                <div className="space-y-3">
                    {options.map((option) => {
                        const selected = isSelected(option.id);

                        return (
                            <Label
                                key={option.id}
                                htmlFor={`mmcq-${question.id}-${option.id}`}
                                className={cn(
                                    "flex items-start space-x-3 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50",
                                    selected ? "border-primary bg-primary/5" : "border-input"
                                )}
                            >
                                <div className="flex items-center h-6 shrink-0">
                                    <Checkbox
                                        checked={selected}
                                        onCheckedChange={(checked) =>
                                            handleMultiSelect(option.id, checked === true)
                                        }
                                        id={`mmcq-${question.id}-${option.id}`}
                                    />
                                </div>
                                <div className="grow min-w-0">
                                    <ContentPreview
                                        content={option.optionText}
                                        noProse
                                        className="p-0 border-0"
                                    />
                                </div>
                            </Label>
                        );
                    })}
                </div>
            ) : (
                // MCQ: Single selection with RadioGroup
                <RadioGroup
                    value={typeof currentAnswer === "string" ? currentAnswer : ""}
                    onValueChange={handleSingleSelect}
                    className="space-y-3"
                >
                    {options.map((option) => {
                        const selected = isSelected(option.id);

                        return (
                            <Label
                                key={option.id}
                                htmlFor={`mcq-${question.id}-${option.id}`}
                                className={cn(
                                    "flex items-start space-x-3 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50",
                                    selected ? "border-primary bg-primary/5" : "border-input"
                                )}
                            >
                                <div className="flex items-center h-6 shrink-0">
                                    <RadioGroupItem
                                        value={option.id}
                                        id={`mcq-${question.id}-${option.id}`}
                                    />
                                </div>
                                <div className="grow min-w-0">
                                    <ContentPreview
                                        content={option.optionText}
                                        noProse
                                        className="p-0 border-0"
                                    />
                                </div>
                            </Label>
                        );
                    })}
                </RadioGroup>
            )}
        </div>
    );
}
