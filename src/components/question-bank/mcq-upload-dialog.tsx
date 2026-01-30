"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { MCQExcelConfirmation, type ParsedMCQRow } from "./mcq-excel-confirmation";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";

interface MCQUploadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTopics: Array<{ id: string; name: string }>;
    bankId: string;
}

export function MCQUploadDialog({ isOpen, onClose, selectedTopics, bankId }: MCQUploadDialogProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [parsedRows, setParsedRows] = useState<ParsedMCQRow[] | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const { success, error } = useToast();
    const router = useRouter();
    const utils = trpc.useUtils();

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setParsedRows(null);
        }
    };

    const handleDownloadTemplate = () => {
        const link = document.createElement("a");
        link.href = "/MCQ_Template.xlsx";
        link.download = "MCQ_Template.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const validateMCQRow = (row: Record<string, unknown>, rowNumber: number): ParsedMCQRow => {
        const errors: string[] = [];

        // Helper function to find column value by matching column name prefix
        const getColumnValue = (possibleNames: string[]): string => {
            for (const key of Object.keys(row)) {
                for (const name of possibleNames) {
                    if (key.toLowerCase().startsWith(name.toLowerCase())) {
                        return String(row[key] || "").trim();
                    }
                }
            }
            return "";
        };

        // Extract values - match column names that start with these prefixes
        const question = getColumnValue(["Question"]);
        const option1 = getColumnValue(["Option_1", "Option 1", "Option1"]);
        const option2 = getColumnValue(["Option_2", "Option 2", "Option2"]);
        const option3 = getColumnValue(["Option_3", "Option 3", "Option3"]);
        const option4 = getColumnValue(["Option_4", "Option 4", "Option4"]);
        const correctAnswerStr = getColumnValue([
            "Correct_Answer",
            "Correct Answer",
            "CorrectAnswer",
        ]);
        const explanation = getColumnValue(["Explanation"]);
        const marksStr = getColumnValue(["Marks"]);
        const negativeMarksStr =
            getColumnValue(["Negative_Marks", "Negative Marks", "NegativeMarks"]) || "0";
        const difficultyStr = (getColumnValue(["Difficulty"]) || "EASY").trim().toUpperCase();
        const bloomsStr = (
            getColumnValue(["Blooms_Taxonomy", "Blooms Taxonomy", "BloomsTaxonomy"]) || "REMEMBER"
        )
            .trim()
            .toUpperCase();
        const coStr = (
            getColumnValue(["Course_Outcome", "Course Outcome", "CourseOutcome"]) || "CO1"
        )
            .trim()
            .toUpperCase();

        // Validate required fields
        if (!question) {
            errors.push("Question text is required");
        }

        if (!option1) {
            errors.push("Option 1 is required");
        }

        if (!option2) {
            errors.push("Option 2 is required");
        }

        if (!correctAnswerStr) {
            errors.push("Correct answer is required");
        }

        if (!marksStr) {
            errors.push("Marks is required");
        }

        // Parse numeric fields
        const marks = parseFloat(marksStr);
        if (isNaN(marks) || marks < 0) {
            errors.push("Marks must be a non-negative number");
        }

        const negativeMarks = parseFloat(negativeMarksStr);
        if (isNaN(negativeMarks) || negativeMarks < 0) {
            errors.push("Negative marks must be a non-negative number");
        }

        // Collect all non-empty options (but keep track of all four for proper matching)
        const allOptions = [
            { text: option1, index: 0 },
            { text: option2, index: 1 },
            { text: option3, index: 2 },
            { text: option4, index: 3 },
        ];

        const nonEmptyOptions = allOptions.filter((opt) => opt.text);
        const options = nonEmptyOptions.map((opt) => opt.text);

        // Find correct answer by matching text (case-insensitive)
        const matchedOption = allOptions.find(
            (opt) => opt.text && opt.text.toLowerCase() === correctAnswerStr.toLowerCase()
        );

        const correctAnswerIndex = matchedOption
            ? nonEmptyOptions.findIndex((opt) => opt.index === matchedOption.index)
            : -1;

        if (correctAnswerIndex === -1 && correctAnswerStr) {
            errors.push(
                `Correct answer "${correctAnswerStr}" does not match any of the provided options: ${options.join(", ")}`
            );
        }

        // Check for duplicate options (exact match, case-sensitive)
        const optionSet = new Set(options);
        if (optionSet.size !== options.length) {
            errors.push("Duplicate options found. Each option must be unique (case-sensitive)");
        }

        // Validate enums
        const validDifficulties = ["EASY", "MEDIUM", "HARD"];
        const difficulty = difficultyStr as "EASY" | "MEDIUM" | "HARD";
        if (!validDifficulties.includes(difficulty)) {
            errors.push(
                `Invalid difficulty "${difficultyStr}". Must be one of: EASY, MEDIUM, HARD`
            );
        }

        const validBloomsTaxonomy = [
            "REMEMBER",
            "UNDERSTAND",
            "APPLY",
            "ANALYZE",
            "EVALUATE",
            "CREATE",
        ];
        const bloomsTaxonomy = bloomsStr as
            | "REMEMBER"
            | "UNDERSTAND"
            | "APPLY"
            | "ANALYZE"
            | "EVALUATE"
            | "CREATE";
        if (!validBloomsTaxonomy.includes(bloomsTaxonomy)) {
            errors.push(
                `Invalid Bloom's Taxonomy "${bloomsStr}". Must be one of: ${validBloomsTaxonomy.join(", ")}`
            );
        }

        const validCourseOutcomes = ["CO1", "CO2", "CO3", "CO4", "CO5", "CO6", "CO7", "CO8"];
        const courseOutcome = coStr as
            | "CO1"
            | "CO2"
            | "CO3"
            | "CO4"
            | "CO5"
            | "CO6"
            | "CO7"
            | "CO8";
        if (!validCourseOutcomes.includes(courseOutcome)) {
            errors.push(
                `Invalid Course Outcome "${coStr}". Must be one of: ${validCourseOutcomes.join(", ")}`
            );
        }

        return {
            rowNumber,
            question,
            option1,
            option2,
            option3: option3 || undefined,
            option4: option4 || undefined,
            correctAnswer: correctAnswerStr,
            correctAnswerIndex,
            explanation: explanation || undefined,
            marks,
            negativeMarks,
            difficulty: difficulty || "EASY",
            bloomsTaxonomy: bloomsTaxonomy || "REMEMBER",
            courseOutcome: courseOutcome || "CO1",
            isValid: errors.length === 0,
            errors,
        };
    };

    const handleParseFile = async () => {
        if (!selectedFile) return;

        try {
            setIsProcessing(true);

            const data = await selectedFile.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                error("Excel file is empty or has no data rows");
                return;
            }

            const parsed = jsonData.map((row, index) =>
                validateMCQRow(row as Record<string, unknown>, index + 2)
            );

            setParsedRows(parsed);
        } catch (err) {
            error("Failed to parse Excel file. Please check the file format.");
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const createQuestionsMutation = trpc.question.createForBank.useMutation();

    const handleConfirmUpload = async () => {
        if (!parsedRows || parsedRows.some((row) => !row.isValid)) return;

        try {
            setIsProcessing(true);

            const topicIds = selectedTopics.map((t) => t.id);

            // Create questions one by one
            for (const row of parsedRows) {
                const options = [row.option1, row.option2, row.option3, row.option4].filter(
                    (opt): opt is string => Boolean(opt)
                );

                const correctOptionIndex = row.correctAnswerIndex;

                // Generate options with IDs first
                const questionOptions = options.map((text, index) => ({
                    id: crypto.randomUUID(),
                    optionText: text,
                    orderIndex: index,
                }));

                await createQuestionsMutation.mutateAsync({
                    bankId,
                    type: "MCQ",
                    question: row.question,
                    explanation: row.explanation,
                    marks: row.marks,
                    negativeMarks: row.negativeMarks,
                    difficulty: row.difficulty,
                    bloomTaxonomyLevel: row.bloomsTaxonomy,
                    courseOutcome: row.courseOutcome,
                    topicIds,
                    questionData: {
                        options: questionOptions,
                    },
                    solution: {
                        correctOptions: questionOptions.map((opt, index) => ({
                            id: opt.id,
                            isCorrect: index === correctOptionIndex,
                        })),
                    },
                });
            }

            success(`Successfully imported ${parsedRows.length} question(s)!`);

            // Invalidate queries
            utils.question.listByBank.invalidate({ bankId });
            utils.question.listByTopics.invalidate({
                bankId,
                topicIds,
            });

            // Reset and close
            setParsedRows(null);
            setSelectedFile(null);
            onClose();

            // Refresh the page to show new questions
            router.refresh();
        } catch (err) {
            error("Failed to import questions. Please try again.");
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancel = () => {
        setParsedRows(null);
        setSelectedFile(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={parsedRows ? undefined : handleCancel}>
            <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                        Upload MCQ Questions
                    </DialogTitle>
                    <DialogDescription>
                        Upload multiple choice questions from an Excel file
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2">
                    {parsedRows ? (
                        <MCQExcelConfirmation
                            parsedRows={parsedRows}
                            onConfirm={handleConfirmUpload}
                            onCancel={() => setParsedRows(null)}
                            isProcessing={isProcessing}
                            selectedTopics={selectedTopics}
                        />
                    ) : (
                        <div className="space-y-6 py-4">
                            {/* Field Requirements */}
                            <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 p-6 space-y-5 shadow-sm">
                                <div className="flex items-center gap-2 pb-2 border-b border-blue-200 dark:border-blue-800">
                                    <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                        Excel Field Requirements
                                    </h3>
                                </div>

                                <div className="space-y-4">
                                    {/* Required Fields */}
                                    <div className="bg-white dark:bg-gray-900/60 rounded-lg p-5 space-y-3 border-l-4 border-red-500 shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Badge
                                                variant="destructive"
                                                className="text-xs font-semibold px-2.5 py-0.5"
                                            >
                                                REQUIRED
                                            </Badge>
                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                These fields must be filled
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2.5">
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-xs px-3 py-1.5 bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700 text-red-900 dark:text-red-100"
                                            >
                                                Question
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-xs px-3 py-1.5 bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700 text-red-900 dark:text-red-100"
                                            >
                                                Option_1
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-xs px-3 py-1.5 bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700 text-red-900 dark:text-red-100"
                                            >
                                                Option_2
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-xs px-3 py-1.5 bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700 text-red-900 dark:text-red-100"
                                            >
                                                Correct_Answer
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-xs px-3 py-1.5 bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700 text-red-900 dark:text-red-100"
                                            >
                                                Marks
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Optional Fields */}
                                    <div className="bg-white dark:bg-gray-900/60 rounded-lg p-5 space-y-3 border-l-4 border-blue-500 shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Badge className="text-xs font-semibold px-2.5 py-0.5 bg-blue-600 dark:bg-blue-500">
                                                OPTIONAL
                                            </Badge>
                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                These fields have default values
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2.5">
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100"
                                            >
                                                Option_3
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100"
                                            >
                                                Option_4
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100"
                                            >
                                                Explanation
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100"
                                            >
                                                Negative_Marks{" "}
                                                <span className="text-blue-600 dark:text-blue-400">
                                                    (0)
                                                </span>
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100"
                                            >
                                                Difficulty{" "}
                                                <span className="text-blue-600 dark:text-blue-400">
                                                    (EASY)
                                                </span>
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100"
                                            >
                                                Blooms_Taxonomy{" "}
                                                <span className="text-blue-600 dark:text-blue-400">
                                                    (REMEMBER)
                                                </span>
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100"
                                            >
                                                Course_Outcome{" "}
                                                <span className="text-blue-600 dark:text-blue-400">
                                                    (CO1)
                                                </span>
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Valid Values */}
                                    <div className="bg-white dark:bg-gray-900/60 rounded-lg p-5 space-y-4 border-l-4 border-purple-500 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge className="text-xs font-semibold px-2.5 py-0.5 bg-purple-600 dark:bg-purple-500">
                                                VALID VALUES
                                            </Badge>
                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Accepted values for enum fields
                                            </span>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                                                    Difficulty:
                                                </span>
                                                <div className="flex gap-2">
                                                    <Badge className="text-xs px-3 py-1 bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700">
                                                        EASY
                                                    </Badge>
                                                    <Badge className="text-xs px-3 py-1 bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700">
                                                        MEDIUM
                                                    </Badge>
                                                    <Badge className="text-xs px-3 py-1 bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700">
                                                        HARD
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                                                    Blooms Taxonomy:
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge className="text-xs px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
                                                        REMEMBER
                                                    </Badge>
                                                    <Badge className="text-xs px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
                                                        UNDERSTAND
                                                    </Badge>
                                                    <Badge className="text-xs px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
                                                        APPLY
                                                    </Badge>
                                                    <Badge className="text-xs px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
                                                        ANALYZE
                                                    </Badge>
                                                    <Badge className="text-xs px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
                                                        EVALUATE
                                                    </Badge>
                                                    <Badge className="text-xs px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
                                                        CREATE
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                                                    Course Outcome:
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                    {[
                                                        "CO1",
                                                        "CO2",
                                                        "CO3",
                                                        "CO4",
                                                        "CO5",
                                                        "CO6",
                                                        "CO7",
                                                        "CO8",
                                                    ].map((co) => (
                                                        <Badge
                                                            key={co}
                                                            className="text-xs px-2.5 py-1 bg-teal-100 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700"
                                                        >
                                                            {co}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-2 pt-2 border-t border-purple-200 dark:border-purple-800">
                                                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                                                    Correct Answer:
                                                </span>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    The exact text of the correct option
                                                    (case-insensitive)
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Selected Topics */}
                            {selectedTopics.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium">
                                        Questions will be added to:
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedTopics.map((topic) => (
                                            <Badge
                                                key={topic.id}
                                                variant="secondary"
                                                className="text-sm"
                                            >
                                                {topic.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Download Template */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">Step 1: Download Template</h4>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={handleDownloadTemplate}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download MCQ Excel Template
                                </Button>
                            </div>

                            {/* Upload File */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">Step 2: Upload Excel File</h4>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept=".xlsx,.xls"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                            id="mcq-file-upload"
                                        />
                                        <label htmlFor="mcq-file-upload">
                                            <Button
                                                variant="outline"
                                                className="w-full cursor-pointer"
                                                asChild
                                            >
                                                <span>
                                                    <Upload className="h-4 w-4 mr-2" />
                                                    {selectedFile
                                                        ? selectedFile.name
                                                        : "Choose Excel File"}
                                                </span>
                                            </Button>
                                        </label>
                                    </div>
                                </div>
                                {selectedFile && (
                                    <p className="text-xs text-muted-foreground">
                                        Selected: {selectedFile.name} (
                                        {(selectedFile.size / 1024).toFixed(2)} KB)
                                    </p>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={isProcessing}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleParseFile}
                                    disabled={!selectedFile || isProcessing}
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                                            Parsing...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Parse & Validate
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
