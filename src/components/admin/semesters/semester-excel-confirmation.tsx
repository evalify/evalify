"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Users, Layers } from "lucide-react";

export interface ParsedCourseRow {
    rowNumber: number;
    semesterName: string;
    courseName: string;
    courseCode: string;
    courseDescription?: string;
    courseType: "CORE" | "ELECTIVE" | "MICRO_CREDENTIAL";
    instructors: string[];
    batches: string[];
    // Validation results
    semesterId?: string;
    instructorIds?: string[];
    batchIds?: string[];
    isValid: boolean;
    errors: string[];
}

interface SemesterExcelConfirmationProps {
    parsedRows: ParsedCourseRow[];
    onConfirm: () => Promise<void>;
    onCancel: () => void;
    isProcessing: boolean;
}

export function SemesterExcelConfirmation({
    parsedRows,
    onConfirm,
    onCancel,
    isProcessing,
}: SemesterExcelConfirmationProps) {
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
                                <p className="text-sm text-muted-foreground">Total Rows</p>
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
                                <p className="text-sm text-muted-foreground">Valid Courses</p>
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

            {/* Error Alert */}
            {hasErrors && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <p className="font-semibold mb-2">
                            Please fix the following errors before proceeding:
                        </p>
                        <p className="text-sm">
                            {invalidRows.length} row{invalidRows.length !== 1 ? "s" : ""} contain
                            {invalidRows.length === 1 ? "s" : ""} validation errors. Review the
                            details below and correct your Excel file.
                        </p>
                    </AlertDescription>
                </Alert>
            )}

            {/* Rows List */}
            <Card>
                <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-4">
                        Course Details {hasErrors ? "(Review Errors)" : "(Ready to Import)"}
                    </h3>
                    <ScrollArea className="h-[400px] w-full pr-4">
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
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs"
                                                        >
                                                            Row {row.rowNumber}
                                                        </Badge>
                                                        {row.isValid ? (
                                                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                        ) : (
                                                            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                                        )}
                                                    </div>
                                                    <h4 className="font-semibold text-base">
                                                        {row.courseName}
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        Code: {row.courseCode}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant={
                                                        row.courseType === "CORE"
                                                            ? "default"
                                                            : row.courseType === "ELECTIVE"
                                                              ? "secondary"
                                                              : "outline"
                                                    }
                                                >
                                                    {row.courseType}
                                                </Badge>
                                            </div>

                                            {/* Details Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground font-medium mb-1">
                                                        Semester:
                                                    </p>
                                                    <p className="font-mono text-xs bg-white dark:bg-gray-900 px-2 py-1 rounded">
                                                        {row.semesterName}
                                                    </p>
                                                </div>

                                                {row.courseDescription && (
                                                    <div>
                                                        <p className="text-muted-foreground font-medium mb-1">
                                                            Description:
                                                        </p>
                                                        <p className="text-xs truncate">
                                                            {row.courseDescription}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Instructors */}
                                            {row.instructors.length > 0 && (
                                                <div>
                                                    <p className="text-muted-foreground font-medium mb-2 text-sm flex items-center gap-2">
                                                        <Users className="h-4 w-4" />
                                                        Instructors ({row.instructors.length}):
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {row.instructors.map((instructor, idx) => (
                                                            <Badge
                                                                key={idx}
                                                                variant="outline"
                                                                className="text-xs"
                                                            >
                                                                {instructor}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Batches */}
                                            {row.batches.length > 0 && (
                                                <div>
                                                    <p className="text-muted-foreground font-medium mb-2 text-sm flex items-center gap-2">
                                                        <Layers className="h-4 w-4" />
                                                        Batches ({row.batches.length}):
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {row.batches.map((batch, idx) => (
                                                            <Badge
                                                                key={idx}
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                {batch}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Errors */}
                                            {!row.isValid && row.errors.length > 0 && (
                                                <Alert variant="destructive" className="mt-3">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <AlertDescription>
                                                        <p className="font-semibold mb-1 text-sm">
                                                            Validation Errors:
                                                        </p>
                                                        <ul className="list-disc list-inside space-y-1 text-xs">
                                                            {row.errors.map((error, idx) => (
                                                                <li key={idx}>{error}</li>
                                                            ))}
                                                        </ul>
                                                    </AlertDescription>
                                                </Alert>
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
                            Creating Courses...
                        </>
                    ) : (
                        `Confirm & Create ${validRows.length} Course${validRows.length !== 1 ? "s" : ""}`
                    )}
                </Button>
            </div>
        </div>
    );
}
