"use client";

import { MCQQuestion, MMCQQuestion, QuestionType, QuestionOption } from "@/types/questions";
import { useState } from "react";
import { TiptapEditor } from "@/components/rich-text-editor/editor";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Save, X, ListChecks, FileText, Edit3, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface MCQComponentProps {
    value: MCQQuestion | MMCQQuestion;
    onChange: (question: MCQQuestion | MMCQQuestion) => void;
}

export default function MCQComponent({ value, onChange }: MCQComponentProps) {
    const [isCreatingNewOption, setIsCreatingNewOption] = useState(false);
    const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
    const [editor, setEditor] = useState<string>("");
    const [allowMultipleCorrect, setAllowMultipleCorrect] = useState(
        value.type === QuestionType.MMCQ
    );

    // Get current options from questionData
    const currentOptions = value.questionData.options || [];

    // Get correct option IDs from solution
    const correctOptionIds = new Set(
        value.solution.correctOptions.filter((opt) => opt.isCorrect).map((opt) => opt.id)
    );

    // Merge options with their correct status
    const options = currentOptions.map((opt) => ({
        ...opt,
        isCorrect: correctOptionIds.has(opt.id),
    }));

    const handleAddOption = () => {
        setIsCreatingNewOption(true);
        setEditingOptionId(null);
        setEditor("");
    };

    const handleEditOption = (optionId: string) => {
        setIsCreatingNewOption(false);
        setEditingOptionId(optionId);
        const option = options.find((opt) => opt.id === optionId);
        if (option) {
            setEditor(option.optionText);
        }
    };

    const handleCancelEdit = () => {
        setIsCreatingNewOption(false);
        setEditingOptionId(null);
        setEditor("");
    };

    const handleDeleteOption = (optionId: string) => {
        const updatedOptions = currentOptions.filter((opt) => opt.id !== optionId);
        const updatedCorrectOptions = value.solution.correctOptions.filter(
            (opt) => opt.id !== optionId
        );

        onChange({
            ...value,
            questionData: {
                ...value.questionData,
                options: updatedOptions,
            },
            solution: {
                ...value.solution,
                correctOptions: updatedCorrectOptions,
            },
        });
    };

    const handleSaveOption = () => {
        if (!editor.trim()) return;

        if (editingOptionId) {
            const updatedOptions = currentOptions.map((opt) =>
                opt.id === editingOptionId ? { ...opt, optionText: editor } : opt
            );

            onChange({
                ...value,
                questionData: {
                    ...value.questionData,
                    options: updatedOptions,
                },
            });
        } else {
            const newOption: Omit<QuestionOption, "isCorrect"> = {
                id: crypto.randomUUID(),
                optionText: editor,
                orderIndex: currentOptions.length,
            };

            onChange({
                ...value,
                questionData: {
                    ...value.questionData,
                    options: [...currentOptions, newOption],
                },
            });
        }

        setIsCreatingNewOption(false);
        setEditingOptionId(null);
        setEditor("");
    };

    const handleSetCorrect = (optionId: string) => {
        const isCurrentlyCorrect = correctOptionIds.has(optionId);

        if (allowMultipleCorrect) {
            // MMCQ: Toggle the option
            const updatedCorrectOptions = isCurrentlyCorrect
                ? value.solution.correctOptions.filter((opt) => opt.id !== optionId)
                : [...value.solution.correctOptions, { id: optionId, isCorrect: true }];

            onChange({
                ...value,
                solution: {
                    ...value.solution,
                    correctOptions: updatedCorrectOptions,
                },
            } as MMCQQuestion);
        } else {
            // MCQ: Set only this option as correct
            onChange({
                ...value,
                solution: {
                    ...value.solution,
                    correctOptions: [{ id: optionId, isCorrect: true }],
                },
            } as MCQQuestion);
        }
    };

    const handleQuestionChange = (content: string) => {
        onChange({ ...value, question: content });
    };

    const handleMultipleCorrectToggle = (enabled: boolean) => {
        setAllowMultipleCorrect(enabled);
        const newType = enabled ? QuestionType.MMCQ : QuestionType.MCQ;

        let updatedCorrectOptions = value.solution.correctOptions;

        if (!enabled && value.solution.correctOptions.length > 1) {
            updatedCorrectOptions = [value.solution.correctOptions[0]!];
        }

        onChange({
            ...value,
            type: newType,
            solution: {
                ...value.solution,
                correctOptions: updatedCorrectOptions,
            },
        } as MCQQuestion | MMCQQuestion);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Question
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <TiptapEditor
                        initialContent={value.question || ""}
                        onUpdate={handleQuestionChange}
                        className="min-h-[200px]"
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ListChecks className="h-5 w-5 text-primary" />
                            Options
                        </CardTitle>

                        <div className="flex items-center gap-2">
                            <Label htmlFor="allow-multiple" className="text-sm">
                                Allow multiple correct answers
                            </Label>
                            <Checkbox
                                id="allow-multiple"
                                checked={allowMultipleCorrect}
                                onCheckedChange={handleMultipleCorrectToggle}
                            />
                        </div>
                    </div>

                    <div className="text-xs text-muted-foreground mt-2">
                        {allowMultipleCorrect
                            ? "Mode: MMCQ - Click options to select multiple correct answers"
                            : "Mode: MCQ - Click to select the single correct answer"}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {options.map((option, index) => (
                        <div
                            key={option.id}
                            className={`flex items-center gap-3 p-3 border-2 rounded-lg transition-all duration-200 cursor-pointer hover:shadow-md ${
                                option.isCorrect
                                    ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                            }`}
                            onClick={() => !editingOptionId && handleSetCorrect(option.id)}
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className={`text-sm font-medium ${
                                        option.isCorrect
                                            ? "text-green-600 dark:text-green-400"
                                            : "text-muted-foreground"
                                    }`}
                                >
                                    {String.fromCharCode(65 + index)}.
                                </span>
                                {option.isCorrect && (
                                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                                )}
                            </div>

                            {editingOptionId === option.id ? (
                                <div className="flex-1 space-y-2">
                                    <TiptapEditor
                                        initialContent={editor}
                                        onUpdate={setEditor}
                                        className="min-h-[100px]"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={handleSaveOption}
                                            disabled={!editor.trim()}
                                        >
                                            <Save className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCancelEdit}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1">
                                        <div
                                            className="prose prose-sm dark:prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{ __html: option.optionText }}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant={option.isCorrect ? "default" : "ghost"}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSetCorrect(option.id);
                                            }}
                                            className={`${
                                                option.isCorrect
                                                    ? "bg-green-600 hover:bg-green-700 text-white"
                                                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                                            }`}
                                        >
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditOption(option.id);
                                            }}
                                            className="hover:bg-gray-100 dark:hover:bg-gray-800"
                                        >
                                            <Edit3 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteOption(option.id);
                                            }}
                                            className="hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    {isCreatingNewOption && (
                        <div className="flex items-start gap-3 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                            <span className="text-sm font-medium text-muted-foreground pt-2">
                                {String.fromCharCode(65 + options.length)}.
                            </span>
                            <div className="flex-1 space-y-2">
                                <TiptapEditor
                                    initialContent=""
                                    onUpdate={setEditor}
                                    className="min-h-[100px]"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={handleSaveOption}
                                        disabled={!editor.trim()}
                                    >
                                        <Save className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <Button
                        variant="outline"
                        onClick={handleAddOption}
                        disabled={isCreatingNewOption || editingOptionId !== null}
                        className="w-full"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
