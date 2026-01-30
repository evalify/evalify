"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Layers, Upload } from "lucide-react";

export interface ParsedMCQRow {
    rowNumber: number;
    question: string;
    option1: string;
    option2: string;
    option3?: string;
    option4?: string;
    correctAnswer: string;
    correctAnswerIndex: number;
    explanation?: string;
    marks: number;
    negativeMarks: number;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    bloomsTaxonomy: "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE" | "EVALUATE" | "CREATE";
    courseOutcome: "CO1" | "CO2" | "CO3" | "CO4" | "CO5" | "CO6" | "CO7" | "CO8";
    isValid: boolean;
    errors: string[];
}

interface MCQExcelConfirmationProps {
    parsedRows: ParsedMCQRow[];
    onConfirm: () => Promise<void>;
    onCancel: () => void;
    isProcessing: boolean;
    selectedTopics: Array<{ id: string; name: string }>;
}

export function MCQExcelConfirmation({
    parsedRows,
    onConfirm,
    onCancel,
    isProcessing,
    selectedTopics,
}: MCQExcelConfirmationProps) {
    const validRows = parsedRows.filter((row) => row.isValid);
    const invalidRows = parsedRows.filter((row) => !row.isValid);
    const hasErrors = invalidRows.length > 0;

    return (
        <div className="space-y-6">
            {/* Summary Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                    className={
                        hasErrors
                            ? "border-red-200 dark:border-red-800"
                            : "border-green-200 dark:border-green-800"
                    }
                >
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Questions</p>
                                <p className="text-2xl font-bold">{parsedRows.length}</p>
                            </div>
                            <Layers className="h-8 w-8 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-green-200 dark:border-green-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Valid Questions</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {validRows.length}
                                </p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-red-200 dark:border-red-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Errors Found</p>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                    {invalidRows.length}
                                </p>
                            </div>
                            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Selected Topics Info */}
            {selectedTopics.length > 0 && (
                <Card>
                    <CardContent className="pt-4">
                        <h4 className="text-sm font-medium mb-2">Questions will be added to:</h4>
                        <div className="flex flex-wrap gap-2">
                            {selectedTopics.map((topic) => (
                                <Badge key={topic.id} variant="secondary">
                                    {topic.name}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Error Alert */}
            {hasErrors && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <p className="font-semibold mb-2">
                            Please fix the following errors before proceeding:
                        </p>
                        <p className="text-sm">
                            {invalidRows.length} question{invalidRows.length !== 1 ? "s" : ""}{" "}
                            contain{invalidRows.length === 1 ? "s" : ""} validation errors. Review
                            the details below and correct your Excel file.
                        </p>
                    </AlertDescription>
                </Alert>
            )}

            {/* Questions List */}
            <Card>
                <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-4">
                        Question Details {hasErrors ? "(Review Errors)" : "(Ready to Import)"}
                    </h3>
                    <ScrollArea className="h-[500px] w-full pr-4">
                        <div className="space-y-4">
                            {parsedRows.map((row) => (
                                <Card
                                    key={row.rowNumber}
                                    className={
                                        row.isValid
                                            ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20"
                                            : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20"
                                    }
                                >
                                    <CardContent className="pt-4 pb-4">
                                        <div className="space-y-3">
                                            {/* Header */}
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge variant="outline">
                                                            Row {row.rowNumber}
                                                        </Badge>
                                                        <Badge
                                                            variant={
                                                                row.isValid
                                                                    ? "default"
                                                                    : "destructive"
                                                            }
                                                        >
                                                            {row.isValid ? "Valid" : "Invalid"}
                                                        </Badge>
                                                    </div>
                                                    <p className="font-medium text-sm line-clamp-2">
                                                        {row.question || "(No question text)"}
                                                    </p>
                                                </div>
                                                {row.isValid ? (
                                                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 ml-2" />
                                                ) : (
                                                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 ml-2" />
                                                )}
                                            </div>

                                            {/* Options */}
                                            <div className="space-y-2">
                                                <p className="text-xs font-medium text-muted-foreground">
                                                    Options:
                                                </p>
                                                <div className="grid grid-cols-1 gap-2 text-sm">
                                                    {[
                                                        row.option1,
                                                        row.option2,
                                                        row.option3,
                                                        row.option4,
                                                    ]
                                                        .filter(Boolean)
                                                        .map((option, idx) => (
                                                            <div
                                                                key={idx}
                                                                className={`flex items-center gap-2 p-2 rounded ${
                                                                    idx === row.correctAnswerIndex
                                                                        ? "bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700"
                                                                        : "bg-muted/50"
                                                                }`}
                                                            >
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-xs"
                                                                >
                                                                    {idx + 1}
                                                                </Badge>
                                                                <span className="flex-1">
                                                                    {option}
                                                                </span>
                                                                {row.correctAnswerIndex === idx && (
                                                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                                )}
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>

                                            {/* Metadata */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                                <div>
                                                    <span className="text-muted-foreground">
                                                        Marks:
                                                    </span>{" "}
                                                    <span className="font-medium">
                                                        +{row.marks} / -{row.negativeMarks}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">
                                                        Difficulty:
                                                    </span>{" "}
                                                    <Badge
                                                        variant="outline"
                                                        className="ml-1 text-xs"
                                                    >
                                                        {row.difficulty}
                                                    </Badge>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">
                                                        Bloom&apos;s:
                                                    </span>{" "}
                                                    <Badge
                                                        variant="outline"
                                                        className="ml-1 text-xs"
                                                    >
                                                        {row.bloomsTaxonomy}
                                                    </Badge>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">
                                                        CO:
                                                    </span>{" "}
                                                    <Badge
                                                        variant="outline"
                                                        className="ml-1 text-xs"
                                                    >
                                                        {row.courseOutcome}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {/* Explanation */}
                                            {row.explanation && (
                                                <div className="text-xs">
                                                    <span className="text-muted-foreground font-medium">
                                                        Explanation:
                                                    </span>{" "}
                                                    <span className="text-muted-foreground">
                                                        {row.explanation}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Errors */}
                                            {!row.isValid && row.errors.length > 0 && (
                                                <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                                                    <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-2">
                                                        Errors:
                                                    </p>
                                                    <ul className="list-disc list-inside space-y-1">
                                                        {row.errors.map((error, idx) => (
                                                            <li
                                                                key={idx}
                                                                className="text-xs text-red-700 dark:text-red-300"
                                                            >
                                                                {error}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-2">
                <Button onClick={onCancel} variant="outline" disabled={isProcessing} size="lg">
                    {hasErrors ? "Go Back & Fix" : "Cancel"}
                </Button>
                <Button
                    onClick={onConfirm}
                    disabled={hasErrors || isProcessing || validRows.length === 0}
                    size="lg"
                    className="px-8"
                >
                    {isProcessing ? (
                        <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                            Importing Questions...
                        </>
                    ) : (
                        <>
                            <Upload className="h-4 w-4 mr-2" />
                            Confirm & Import {validRows.length} Question
                            {validRows.length !== 1 ? "s" : ""}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
