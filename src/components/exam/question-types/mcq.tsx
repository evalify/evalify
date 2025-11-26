"use client";

import { QuizQuestion } from "../context/quiz-context";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ContentPreview } from "@/components/rich-text-editor/content-preview";
import type { MCQStudentAnswer, MMCQStudentAnswer } from "../lib/types";

interface MCQQuestionProps {
    question: QuizQuestion;
    onAnswerChange: (answer: MCQStudentAnswer | MMCQStudentAnswer) => void;
    isMMCQ?: boolean;
}

export function MCQQuestion({ question, onAnswerChange, isMMCQ = false }: MCQQuestionProps) {
    // Extract options from questionData - questionData is directly MCQData or MMCQData
    const mcqData = question.questionData;

    const rawOptions = mcqData?.options || [];

    // Sort options by orderIndex if available
    const options = Array.isArray(rawOptions)
        ? [...rawOptions].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
        : [];

    // Helper to get option ID and Text
    const getOptionId = (opt: { id: string; optionText: string }) => opt.id;
    const getOptionText = (opt: { id: string; optionText: string }) => opt.optionText;

    // Handle current answer - properly typed based on question type
    const currentAnswer = isMMCQ
        ? (question.response as MMCQStudentAnswer | undefined)?.studentAnswer || []
        : (question.response as MCQStudentAnswer | undefined)?.studentAnswer || "";

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

    return (
        <div className="space-y-6">
            <div className="prose prose-sm max-w-none dark:prose-invert">
                <ContentPreview content={(question.question as string) || ""} />
            </div>

            <div className="space-y-3">
                {options.map((option) => {
                    const optionId = getOptionId(option);
                    const optionText = getOptionText(option);
                    const selected = isSelected(optionId);

                    return (
                        <div
                            key={optionId}
                            className={cn(
                                "flex items-start space-x-3 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50",
                                selected ? "border-primary bg-primary/5" : "border-input"
                            )}
                            onClick={() => {
                                if (isMMCQ) {
                                    handleMultiSelect(optionId, !selected);
                                } else {
                                    handleSingleSelect(optionId);
                                }
                            }}
                        >
                            <div className="flex items-center h-6 shrink-0">
                                {isMMCQ ? (
                                    <Checkbox
                                        checked={selected}
                                        onCheckedChange={(checked) =>
                                            handleMultiSelect(optionId, checked as boolean)
                                        }
                                        id={optionId}
                                    />
                                ) : (
                                    <RadioGroup
                                        value={currentAnswer as string}
                                        onValueChange={handleSingleSelect}
                                    >
                                        <RadioGroupItem value={optionId} id={optionId} />
                                    </RadioGroup>
                                )}
                            </div>
                            <div className="flex-grow min-w-0">
                                <Label
                                    htmlFor={optionId}
                                    className="cursor-pointer font-normal block"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ContentPreview
                                        content={optionText}
                                        noProse
                                        className="p-0 border-0"
                                    />
                                </Label>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
