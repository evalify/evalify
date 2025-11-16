"use client";

import { capitalizeName } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Upload, Info, X, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import { trpc } from "@/lib/trpc/client";
import * as XLSX from "xlsx";
import { SemesterExcelConfirmation, ParsedCourseRow } from "./semester-excel-confirmation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CourseBulkCreateFormProps {
    onCancel: () => void;
}

// Type for Excel row data
interface ExcelCourseRow {
    "Semester Name"?: string;
    "Course Name"?: string;
    "Course Code"?: string;
    "Course Description"?: string;
    'Course Type ["CORE", "ELECTIVE", "MICRO_CREDENTIAL"]'?: string;
    "Instructors (Pipe Separated)"?: string;
    "Batches (Pipe Separated)"?: string;
}

// Helper function to parse pipe-separated values
function parsePipeSeparated(value: string | undefined): string[] {
    if (!value || typeof value !== "string") return [];
    return value
        .split("|")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
}

export function CourseBulkCreateForm({ onCancel }: CourseBulkCreateFormProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [parsedRows, setParsedRows] = useState<ParsedCourseRow[]>([]);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { success, error } = useToast();
    const { track } = useAnalytics();

    // tRPC queries for validation
    const utils = trpc.useUtils();
    const bulkCreateCourses = trpc.course.bulkCreate.useMutation({
        onSuccess: (data) => {
            success(`Successfully created ${data.count} courses!`);
            utils.course.list.invalidate();
            setShowConfirmation(false);
            setParsedRows([]);
            setSelectedFile(null);
            onCancel();
        },
        onError: (err) => {
            error(err.message || "Failed to create courses");
        },
    });

    const handleDownloadTemplate = () => {
        try {
            const link = document.createElement("a");
            link.href = "/Course_Add_Bulk.xlsx";
            link.download = "Course_Add_Bulk.xlsx";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            success("Template downloaded successfully");
            track("course_bulk_template_downloaded");
        } catch (_err) {
            error("Failed to download template");
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            const validTypes = [
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-excel",
            ];

            if (!validTypes.includes(file.type) && !file.name.endsWith(".xlsx")) {
                error("Please upload a valid Excel file (.xlsx)");
                return;
            }

            setSelectedFile(file);
            track("course_bulk_file_selected", { fileName: file.name });
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        // Reset the file input
        const fileInput = document.getElementById("course-file-upload") as HTMLInputElement;
        if (fileInput) {
            fileInput.value = "";
        }
    };

    const handleSubmit = async () => {
        if (!selectedFile) {
            error("Please select a file to upload");
            return;
        }

        try {
            setIsUploading(true);
            track("course_bulk_upload_initiated", { fileName: selectedFile.name });

            // Parse the Excel file
            const data = await parseExcelFile(selectedFile);

            if (data.length === 0) {
                error("No data found in the Excel file");
                return;
            }

            // Validate all rows
            const validated = await validateRows(data);
            setParsedRows(validated);
            setShowConfirmation(true);
        } catch (_err) {
            error("Failed to process the file");
        } finally {
            setIsUploading(false);
        }
    };

    const parseExcelFile = async (file: File): Promise<ExcelCourseRow[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: "binary" });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json<ExcelCourseRow>(worksheet);
                    resolve(jsonData);
                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsBinaryString(file);
        });
    };

    const validateRows = async (data: ExcelCourseRow[]): Promise<ParsedCourseRow[]> => {
        const validatedRows: ParsedCourseRow[] = [];

        // Fetch all necessary data for validation (using listAll endpoints without pagination)
        const [semesters, batches, users] = await Promise.all([
            utils.semester.listAll.fetch(),
            utils.batch.listAll.fetch(),
            utils.user.listAll.fetch({ role: "FACULTY" }),
        ]);

        const facultyUsers = users;

        // Create lookup maps for faster validation
        const semesterMap = new Map(semesters.map((s) => [s.name.toLowerCase(), s]));
        const batchMap = new Map(batches.map((b) => [b.name.toLowerCase(), b]));

        // Create faculty map using profileId
        const facultyMap = new Map(facultyUsers.map((f) => [f.profileId.toLowerCase(), f]));

        // Track processed courses to detect duplicates within the upload
        // Key format: semesterId-courseCode-sortedBatchIds-sortedInstructorIds
        const processedCourses = new Map<string, number>();

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNumber = i + 2; // +2 because Excel is 1-indexed and we skip header
            const errors: string[] = [];

            // Parse row data
            const semesterName = row["Semester Name"]?.toString().trim() || "";
            const rawCourseName = row["Course Name"]?.toString().trim() || "";
            const rawCourseCode = row["Course Code"]?.toString().trim() || "";
            const courseDescription = row["Course Description"]?.toString().trim();
            const rawCourseType =
                row['Course Type ["CORE", "ELECTIVE", "MICRO_CREDENTIAL"]']
                    ?.toString()
                    .trim()
                    .toUpperCase() || "";
            const instructorsStr = row["Instructors (Pipe Separated)"]?.toString() || "";
            const batchesStr = row["Batches (Pipe Separated)"]?.toString() || "";

            // Normalize data
            const courseName = capitalizeName(rawCourseName);
            const courseCode = rawCourseCode.toUpperCase();
            const instructors = parsePipeSeparated(instructorsStr);
            const batchNames = parsePipeSeparated(batchesStr);

            // Validation 1: Required fields
            if (!semesterName) {
                errors.push("Semester name is required");
            }
            if (!courseName) {
                errors.push("Course name is required");
            }
            if (!courseCode) {
                errors.push("Course code is required");
            }

            // Validation 2: Course type must be exact match
            const validCourseTypes = ["CORE", "ELECTIVE", "MICRO_CREDENTIAL"];
            let courseType: "CORE" | "ELECTIVE" | "MICRO_CREDENTIAL" | undefined;

            if (!validCourseTypes.includes(rawCourseType)) {
                errors.push(
                    `Course type must be exactly one of: ${validCourseTypes.join(", ")}. Got: "${rawCourseType}"`
                );
            } else {
                courseType = rawCourseType as "CORE" | "ELECTIVE" | "MICRO_CREDENTIAL";
            }

            // Validation 3: Semester must exist
            let semesterId: string | undefined;
            const semester = semesterMap.get(semesterName.toLowerCase());
            if (!semester) {
                errors.push(`Semester "${semesterName}" not found in the system`);
            } else {
                semesterId = semester.id;
            }

            // Validation 5: All instructors must exist and be FACULTY
            const instructorIds: string[] = [];
            const invalidInstructors: string[] = [];

            for (const instructorProfileId of instructors) {
                const faculty = facultyMap.get(instructorProfileId.toLowerCase());
                if (!faculty) {
                    invalidInstructors.push(instructorProfileId);
                } else {
                    instructorIds.push(faculty.id);
                }
            }

            if (invalidInstructors.length > 0) {
                errors.push(`Invalid or non-faculty instructors: ${invalidInstructors.join(", ")}`);
            }

            // Validation 6: All batches must exist
            const batchIds: string[] = [];
            const invalidBatches: string[] = [];

            for (const batchName of batchNames) {
                const batch = batchMap.get(batchName.toLowerCase());
                if (!batch) {
                    invalidBatches.push(batchName);
                } else {
                    batchIds.push(batch.id);
                }
            }

            if (invalidBatches.length > 0) {
                errors.push(`Invalid batches: ${invalidBatches.join(", ")}`);
            }

            // Validation 7: Check for exact duplicate courses (same semester, code, batches, and instructors)
            // Create a unique key for this course combination
            const sortedBatchIds = [...batchIds].sort().join(",");
            const sortedInstructorIds = [...instructorIds].sort().join(",");
            const courseKey =
                `${semesterId}-${courseCode}-${sortedBatchIds}-${sortedInstructorIds}`.toLowerCase();

            // Check for duplicates within this upload
            if (processedCourses.has(courseKey)) {
                const duplicateRowNumber = processedCourses.get(courseKey);
                errors.push(
                    `Exact duplicate found: This course with the same code, batches, and instructors already appears in row ${duplicateRowNumber}`
                );
            } else if (semesterId && courseCode && errors.length === 0) {
                processedCourses.set(courseKey, rowNumber);
            }

            validatedRows.push({
                rowNumber,
                semesterName,
                courseName,
                courseCode,
                courseDescription,
                courseType: courseType || "CORE",
                instructors,
                batches: batchNames,
                semesterId,
                instructorIds,
                batchIds,
                isValid: errors.length === 0,
                errors,
            });
        }

        // After all rows are validated, check for exact duplicates in the database
        // Only check rows that passed basic validation and have all required IDs
        const rowsToCheckForDuplicates = validatedRows.filter(
            (row) => row.semesterId && row.courseCode && row.isValid
        );

        if (rowsToCheckForDuplicates.length > 0) {
            const duplicateCheckData = rowsToCheckForDuplicates.map((row) => ({
                semesterId: row.semesterId!,
                code: row.courseCode,
                batchIds: row.batchIds || [],
                instructorIds: row.instructorIds || [],
            }));

            const duplicateResults = await utils.course.checkDuplicates.fetch({
                courses: duplicateCheckData,
            });

            // Update validation results with duplicate information
            duplicateResults.forEach((result, index) => {
                if (result.isDuplicate) {
                    const row = rowsToCheckForDuplicates[index];
                    row.isValid = false;
                    row.errors.push(
                        `Exact duplicate: A course "${result.code}" with the same batches and instructors already exists in this semester (${result.existingCourseName})`
                    );
                }
            });
        }

        return validatedRows;
    };

    const handleConfirm = async () => {
        try {
            setIsProcessing(true);

            const validRows = parsedRows.filter((row) => row.isValid);

            if (validRows.length === 0) {
                error("No valid rows to process");
                return;
            }

            // Prepare data for bulk creation
            const coursesToCreate = validRows.map((row) => ({
                name: row.courseName,
                code: row.courseCode,
                description: row.courseDescription,
                type: row.courseType,
                semesterId: row.semesterId!,
                instructorIds: row.instructorIds,
                batchIds: row.batchIds,
                isActive: "ACTIVE" as const,
            }));

            await bulkCreateCourses.mutateAsync({ courses: coursesToCreate });
            track("courses_bulk_created", { count: coursesToCreate.length });
        } catch (_err) {
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancelConfirmation = () => {
        setShowConfirmation(false);
        setParsedRows([]);
    };

    return (
        <div className="space-y-8">
            {/* Instructions Section */}
            <Alert className="bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                    <div className="space-y-4">
                        <p className="font-semibold text-base">How to Bulk Create Courses:</p>
                        <ol className="list-decimal list-inside space-y-3 ml-1 text-[15px] leading-relaxed">
                            <li>Download the Excel template using the button below</li>
                            <li className="font-semibold text-blue-800 dark:text-blue-200">
                                Important: Delete the example row before adding your data
                            </li>
                            <li>Verify that the semester name exists and is spelled correctly</li>
                            <li>Fill in all required information for each course</li>
                            <li>Save the Excel file and upload it below</li>
                        </ol>
                    </div>
                </AlertDescription>
            </Alert>

            {/* Template Structure Information */}
            <Card className="bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-2">
                <CardContent className="pt-6 pb-6">
                    <h4 className="font-bold text-base mb-5 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <FileSpreadsheet className="h-5 w-5" />
                        Template Structure Guide
                    </h4>
                    <div className="space-y-4">
                        <div className="space-y-3.5">
                            {/* Semester Name */}
                            <div className="bg-white dark:bg-gray-950 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1.5 text-[15px]">
                                    Semester Name <span className="text-red-500">*</span>
                                </p>
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                    The name of the semester (e.g., S2-AID-25). Must match an
                                    existing semester in the system.
                                </p>
                            </div>

                            {/* Course Name */}
                            <div className="bg-white dark:bg-gray-950 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1.5 text-[15px]">
                                    Course Name <span className="text-red-500">*</span>
                                </p>
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                    The full name of the course (e.g., Operating Systems).
                                </p>
                            </div>

                            {/* Course Code */}
                            <div className="bg-white dark:bg-gray-950 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1.5 text-[15px]">
                                    Course Code <span className="text-red-500">*</span>
                                </p>
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                    The unique identifier for the course (e.g., AID203).
                                </p>
                            </div>

                            {/* Course Description */}
                            <div className="bg-white dark:bg-gray-950 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1.5 text-[15px]">
                                    Course Description
                                </p>
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                    Optional description of the course. Can be left empty if not
                                    needed.
                                </p>
                            </div>

                            {/* Course Type */}
                            <div className="bg-white dark:bg-gray-950 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1.5 text-[15px]">
                                    Course Type <span className="text-red-500">*</span>
                                </p>
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-2">
                                    Must be exactly one of these values (case-sensitive):
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                    <code className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-mono">
                                        CORE
                                    </code>
                                    <code className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs font-mono">
                                        ELECTIVE
                                    </code>
                                    <code className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs font-mono">
                                        MICRO_CREDENTIAL
                                    </code>
                                </div>
                            </div>

                            {/* Instructors */}
                            <div className="bg-white dark:bg-gray-950 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1.5 text-[15px]">
                                    Instructors
                                </p>
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-2">
                                    Instructor profile IDs separated by pipe character ( | ). For
                                    multiple instructors:
                                </p>
                                <code className="px-3 py-1.5 bg-orange-50 dark:bg-orange-950 text-orange-800 dark:text-orange-200 rounded text-xs font-mono block">
                                    ramkumar | mohan | s_rahul1
                                </code>
                            </div>

                            {/* Batches */}
                            <div className="bg-white dark:bg-gray-950 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1.5 text-[15px]">
                                    Batches
                                </p>
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-2">
                                    Batch names separated by pipe character ( | ). For multiple
                                    batches:
                                </p>
                                <code className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 rounded text-xs font-mono block">
                                    2025AIDA | 2025AIDB | 2025AIDC
                                </code>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Download Template Button */}
            <div>
                <Button
                    onClick={handleDownloadTemplate}
                    variant="default"
                    size="lg"
                    className="w-full flex items-center justify-center gap-3 text-base font-semibold h-12"
                    type="button"
                >
                    <Download className="h-5 w-5" />
                    Download Excel Template
                </Button>
            </div>

            {/* File Upload Section */}
            <Card className="border-2">
                <CardContent className="pt-6 pb-6">
                    <div className="space-y-5">
                        <div className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                            <h4 className="font-bold text-base text-gray-900 dark:text-gray-100">
                                Upload Your Completed Template
                            </h4>
                        </div>

                        {!selectedFile ? (
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors bg-gray-50 dark:bg-gray-900">
                                <Upload className="h-14 w-14 mx-auto mb-5 text-gray-400" />
                                <label
                                    htmlFor="course-file-upload"
                                    className="cursor-pointer block"
                                >
                                    <span className="text-base font-medium text-gray-700 dark:text-gray-300 block mb-2">
                                        Click to upload or drag and drop
                                    </span>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Excel files only (.xlsx)
                                    </p>
                                    <input
                                        id="course-file-upload"
                                        type="file"
                                        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        ) : (
                            <div className="border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 rounded-lg p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <FileSpreadsheet className="h-10 w-10 text-green-600 dark:text-green-400" />
                                        <div>
                                            <p className="font-semibold text-base text-gray-900 dark:text-gray-100">
                                                {selectedFile.name}
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                {(selectedFile.size / 1024).toFixed(2)} KB
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleRemoveFile}
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-950"
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-2">
                <Button
                    onClick={onCancel}
                    variant="outline"
                    disabled={isUploading}
                    size="lg"
                    className="px-8"
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={!selectedFile || isUploading}
                    size="lg"
                    className="flex items-center gap-2 px-8"
                >
                    {isUploading ? (
                        <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Upload className="h-4 w-4" />
                            Upload & Process
                        </>
                    )}
                </Button>
            </div>

            {/* Confirmation Modal */}
            <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
                <DialogContent className="sm:max-w-6xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Review & Confirm Bulk Course Creation</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[calc(90vh-100px)]">
                        <SemesterExcelConfirmation
                            parsedRows={parsedRows}
                            onConfirm={handleConfirm}
                            onCancel={handleCancelConfirmation}
                            isProcessing={isProcessing}
                        />
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}
