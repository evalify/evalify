"use client";

import { QuizQuestion } from "../context/quiz-context";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ContentPreview } from "@/components/rich-text-editor/content-preview";
import { QuestionHeader } from "./question-header";
import type { MCQStudentAnswer, MMCQStudentAnswer } from "../lib/types";

interface MCQOption {
    id: string;
    optionText: string;
    orderIndex?: number;
}

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

function extractOptions(question: QuizQuestion): MCQOption[] {
    const mcqData = question.questionData as ExtendedMCQData | undefined;

    if (mcqData?.options && Array.isArray(mcqData.options)) {
        return mcqData.options;
    }
    if (mcqData?.data?.options && Array.isArray(mcqData.data.options)) {
        return mcqData.data.options;
    }

    const withOptions = question as QuizQuestion & { options?: MCQOption[] };
    if (withOptions.options && Array.isArray(withOptions.options)) {
        return withOptions.options;
    }

    return [];
}

export function MCQQuestion({ question, onAnswerChange, isMMCQ = false }: MCQQuestionProps) {
    const options = [...extractOptions(question)].sort(
        (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
    );

    const currentAnswer = isMMCQ
        ? ((question.response as MMCQStudentAnswer | undefined)?.studentAnswer ?? [])
        : ((question.response as MCQStudentAnswer | undefined)?.studentAnswer ?? "");

    const handleSingleSelect = (value: string) => {
        onAnswerChange({ studentAnswer: value } as MCQStudentAnswer);
    };

    const handleMultiSelect = (optionId: string, checked: boolean) => {
        const currentSelected = Array.isArray(currentAnswer) ? currentAnswer : [];
        const newSelected = checked
            ? [...currentSelected, optionId]
            : currentSelected.filter((id) => id !== optionId);
        onAnswerChange({ studentAnswer: newSelected } as MMCQStudentAnswer);
    };

    const isSelected = (optionId: string): boolean => {
        if (isMMCQ) {
            return Array.isArray(currentAnswer) && currentAnswer.includes(optionId);
        }
        return currentAnswer === optionId;
    };

    if (options.length === 0) {
        return (
            <div className="space-y-6">
                <QuestionHeader question={question} />
                <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ContentPreview content={(question.question as string) || ""} />
                </div>
                <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
                    <p className="text-sm font-medium">No options available for this question.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <QuestionHeader question={question} />

            <div className="prose prose-sm max-w-none dark:prose-invert">
                <ContentPreview content={(question.question as string) || ""} />
            </div>

            {isMMCQ ? (
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
