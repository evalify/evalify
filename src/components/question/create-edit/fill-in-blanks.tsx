"use client";

import {
    FillInBlanksQuestion,
    FillInBlanksEvaluationType,
    FillInBlanksAcceptedType,
} from "@/types/questions";
import { useEffect, useRef } from "react";
import { TiptapEditor, TiptapEditorRef } from "@/components/rich-text-editor/editor";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ListOrdered, Plus, Trash2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface FillInBlanksComponentProps {
    value: FillInBlanksQuestion;
    onChange: (question: FillInBlanksQuestion) => void;
}

const BLANK_REGEX = /_{3,}/g;

export default function FillInBlanksComponent({ value, onChange }: FillInBlanksComponentProps) {
    const editorRef = useRef<TiptapEditorRef>(null);

    const blanks = (value.question || "").match(BLANK_REGEX);
    const detectedBlanks = blanks ? blanks.length : 0;

    const totalWeight = Object.values(value.blankConfig?.blankWeights || {}).reduce(
        (sum, weight) => sum + (weight || 0),
        0
    );
    const isWeightValid = Math.abs(totalWeight - value.marks) < 0.01;

    useEffect(() => {
        if (!value.blankConfig || detectedBlanks !== value.blankConfig.blankCount) {
            const newAcceptableAnswers: Record<
                number,
                { answers: string[]; type: FillInBlanksAcceptedType }
            > = {};
            const newBlankWeights: Record<number, number> = {};

            for (let i = 0; i < detectedBlanks; i++) {
                newAcceptableAnswers[i] = value.blankConfig?.acceptableAnswers?.[i] || {
                    answers: [""],
                    type: FillInBlanksAcceptedType.TEXT,
                };
                newBlankWeights[i] = value.blankConfig?.blankWeights?.[i] || 1;
            }

            onChange({
                ...value,
                blankConfig: {
                    blankCount: detectedBlanks,
                    acceptableAnswers: newAcceptableAnswers,
                    blankWeights: newBlankWeights,
                    evaluationType:
                        value.blankConfig?.evaluationType || FillInBlanksEvaluationType.NORMAL,
                },
            });
        }
    }, [value.question, detectedBlanks, value.blankConfig, onChange, value]);

    const handleQuestionChange = (content: string) => {
        onChange({ ...value, question: content });
    };

    const handleAddAnswer = (blankIndex: number) => {
        const currentAnswerGroup = value.blankConfig?.acceptableAnswers?.[blankIndex];
        if (!currentAnswerGroup) return;

        onChange({
            ...value,
            blankConfig: {
                ...value.blankConfig,
                acceptableAnswers: {
                    ...value.blankConfig.acceptableAnswers,
                    [blankIndex]: {
                        ...currentAnswerGroup,
                        answers: [...currentAnswerGroup.answers, ""],
                    },
                },
            },
        });
    };

    const handleRemoveAnswer = (blankIndex: number, answerIndex: number) => {
        const currentAnswerGroup = value.blankConfig?.acceptableAnswers?.[blankIndex];
        if (!currentAnswerGroup) return;

        onChange({
            ...value,
            blankConfig: {
                ...value.blankConfig,
                acceptableAnswers: {
                    ...value.blankConfig.acceptableAnswers,
                    [blankIndex]: {
                        ...currentAnswerGroup,
                        answers: currentAnswerGroup.answers.filter((_, i) => i !== answerIndex),
                    },
                },
            },
        });
    };

    const handleAnswerChange = (blankIndex: number, answerIndex: number, answer: string) => {
        const currentAnswerGroup = value.blankConfig?.acceptableAnswers?.[blankIndex];
        if (!currentAnswerGroup) return;

        const newAnswers = [...currentAnswerGroup.answers];
        newAnswers[answerIndex] = answer;

        onChange({
            ...value,
            blankConfig: {
                ...value.blankConfig,
                acceptableAnswers: {
                    ...value.blankConfig.acceptableAnswers,
                    [blankIndex]: {
                        ...currentAnswerGroup,
                        answers: newAnswers,
                    },
                },
            },
        });
    };

    const handleAnswerTypeChange = (blankIndex: number, type: FillInBlanksAcceptedType) => {
        const currentAnswerGroup = value.blankConfig?.acceptableAnswers?.[blankIndex];
        if (!currentAnswerGroup) return;

        onChange({
            ...value,
            blankConfig: {
                ...value.blankConfig,
                acceptableAnswers: {
                    ...value.blankConfig.acceptableAnswers,
                    [blankIndex]: {
                        ...currentAnswerGroup,
                        type,
                    },
                },
            },
        });
    };

    const handleWeightChange = (blankIndex: number, weight: string) => {
        const numWeight = parseFloat(weight) || 0;
        onChange({
            ...value,
            blankConfig: {
                ...value.blankConfig,
                blankWeights: {
                    ...value.blankConfig.blankWeights,
                    [blankIndex]: numWeight,
                },
            },
        });
    };

    const handleEvaluationTypeChange = (evaluationType: FillInBlanksEvaluationType) => {
        onChange({
            ...value,
            blankConfig: {
                ...value.blankConfig,
                evaluationType,
            },
        });
    };

    const handleInsertBlank = () => {
        if (editorRef.current?.editor) {
            editorRef.current.editor.commands.insertContent("___");
            editorRef.current.editor.commands.focus();
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FileText className="h-5 w-5 text-primary" />
                                Question
                            </CardTitle>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Use three or more underscores (___) to create blanks in your
                                question text
                            </p>
                        </div>
                        <Button onClick={handleInsertBlank} size="sm" variant="outline">
                            <Plus className="mr-2 h-4 w-4" />
                            Insert Blank
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <TiptapEditor
                        ref={editorRef}
                        initialContent={value.question || ""}
                        onUpdate={handleQuestionChange}
                        className="min-h-[200px]"
                    />
                    <div className="mt-4 text-sm">
                        <span className="font-medium">Detected Blanks:</span>{" "}
                        <span className="font-semibold text-primary">{detectedBlanks}</span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Evaluation Settings</CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Choose how student answers will be evaluated
                    </p>
                </CardHeader>
                <CardContent>
                    <Tabs
                        value={
                            value.blankConfig?.evaluationType || FillInBlanksEvaluationType.NORMAL
                        }
                        onValueChange={(val) =>
                            handleEvaluationTypeChange(val as FillInBlanksEvaluationType)
                        }
                    >
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value={FillInBlanksEvaluationType.STRICT}>
                                Strict
                            </TabsTrigger>
                            <TabsTrigger value={FillInBlanksEvaluationType.NORMAL}>
                                Normal
                            </TabsTrigger>
                            <TabsTrigger value={FillInBlanksEvaluationType.LENIENT}>
                                Lenient
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value={FillInBlanksEvaluationType.STRICT} className="mt-4">
                            <div className="rounded-md bg-muted/50 p-4">
                                <h4 className="mb-2 font-medium">Strict Evaluation</h4>
                                <p className="text-sm text-muted-foreground">
                                    Case-sensitive matching with spaces stripped. Student answer
                                    must exactly match one of the acceptable answers (case matters).
                                </p>
                            </div>
                        </TabsContent>
                        <TabsContent value={FillInBlanksEvaluationType.NORMAL} className="mt-4">
                            <div className="rounded-md bg-muted/50 p-4">
                                <h4 className="mb-2 font-medium">Normal Evaluation</h4>
                                <p className="text-sm text-muted-foreground">
                                    Case-insensitive matching with spaces stripped. Student answer
                                    must match one of the acceptable answers (case doesn&apos;t
                                    matter).
                                </p>
                            </div>
                        </TabsContent>
                        <TabsContent value={FillInBlanksEvaluationType.LENIENT} className="mt-4">
                            <div className="rounded-md bg-muted/50 p-4">
                                <h4 className="mb-2 font-medium">Lenient Evaluation</h4>
                                <p className="text-sm text-muted-foreground">
                                    More flexible evaluation that accepts minor variations and
                                    synonyms. Useful for answers that have multiple valid forms.
                                </p>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {detectedBlanks > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ListOrdered className="h-5 w-5 text-primary" />
                            Blank Answers
                        </CardTitle>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Define acceptable answers for each blank
                        </p>
                        {!isWeightValid && (
                            <Alert variant="destructive" className="mt-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Total weight ({totalWeight.toFixed(2)}) must equal total marks (
                                    {value.marks})
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {Array.from({ length: detectedBlanks }).map((_, blankIndex) => {
                            const answerGroup = value.blankConfig?.acceptableAnswers?.[
                                blankIndex
                            ] || {
                                answers: [""],
                                type: FillInBlanksAcceptedType.TEXT,
                            };
                            return (
                                <div
                                    key={blankIndex}
                                    className="space-y-4 rounded-lg border bg-muted/20 p-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold">Blank {blankIndex + 1}</h4>
                                        <div className="flex items-center gap-2">
                                            <Label
                                                htmlFor={`weight-${blankIndex}`}
                                                className="text-sm"
                                            >
                                                Weight:
                                            </Label>
                                            <Input
                                                id={`weight-${blankIndex}`}
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={
                                                    value.blankConfig?.blankWeights?.[blankIndex] ??
                                                    ""
                                                }
                                                onChange={(e) =>
                                                    handleWeightChange(blankIndex, e.target.value)
                                                }
                                                placeholder="1"
                                                className="h-8 w-20"
                                            />
                                        </div>
                                    </div>

                                    {answerGroup && (
                                        <div className="space-y-2 rounded-md border bg-background p-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-medium text-muted-foreground">
                                                    Answer Type
                                                </Label>
                                                <Select
                                                    value={answerGroup.type}
                                                    onValueChange={(val) =>
                                                        handleAnswerTypeChange(
                                                            blankIndex,
                                                            val as FillInBlanksAcceptedType
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="h-8 w-32">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem
                                                            value={FillInBlanksAcceptedType.TEXT}
                                                        >
                                                            Text
                                                        </SelectItem>
                                                        <SelectItem
                                                            value={FillInBlanksAcceptedType.NUMBER}
                                                        >
                                                            Number
                                                        </SelectItem>
                                                        <SelectItem
                                                            value={
                                                                FillInBlanksAcceptedType.UPPERCASE
                                                            }
                                                        >
                                                            Uppercase
                                                        </SelectItem>
                                                        <SelectItem
                                                            value={
                                                                FillInBlanksAcceptedType.LOWERCASE
                                                            }
                                                        >
                                                            Lowercase
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                {answerGroup.answers.map((answer, answerIndex) => (
                                                    <div key={answerIndex} className="flex gap-2">
                                                        <Input
                                                            placeholder={`Answer ${answerIndex + 1}`}
                                                            value={answer}
                                                            onChange={(e) =>
                                                                handleAnswerChange(
                                                                    blankIndex,
                                                                    answerIndex,
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() =>
                                                                handleRemoveAnswer(
                                                                    blankIndex,
                                                                    answerIndex
                                                                )
                                                            }
                                                            disabled={
                                                                answerGroup.answers.length === 1
                                                            }
                                                            className="hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>

                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleAddAnswer(blankIndex)}
                                                className="w-full"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add Alternative Answer
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
