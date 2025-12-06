"use client";

import React, { useState, useCallback, useRef } from "react";
import { QuizQuestion } from "../context/quiz-context";
import { ContentPreview } from "@/components/rich-text-editor/content-preview";
import { QuestionHeader } from "./question-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Upload,
    File,
    X,
    AlertCircle,
    CheckCircle,
    Loader2,
    FileText,
    Image as ImageIcon,
    FileCode,
    FileArchive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileUploadStudentAnswer } from "../lib/types";
import type { FileUploadConfig } from "@/types/questions";

interface FileUploadQuestionProps {
    question: QuizQuestion;
    onAnswerChange: (answer: FileUploadStudentAnswer) => void;
}

// Helper to get file icon based on file type
function getFileIcon(fileName: string) {
    const ext = fileName.split(".").pop()?.toLowerCase();

    if (["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(ext || "")) {
        return <ImageIcon className="h-5 w-5 text-blue-500" />;
    }
    if (["pdf", "doc", "docx", "txt", "rtf", "odt"].includes(ext || "")) {
        return <FileText className="h-5 w-5 text-red-500" />;
    }
    if (["js", "ts", "py", "java", "cpp", "c", "html", "css", "json"].includes(ext || "")) {
        return <FileCode className="h-5 w-5 text-green-500" />;
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext || "")) {
        return <FileArchive className="h-5 w-5 text-yellow-500" />;
    }
    return <File className="h-5 w-5 text-muted-foreground" />;
}

// Format file size
function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function FileUploadQuestion({ question, onAnswerChange }: FileUploadQuestionProps) {
    const fileUploadConfig: FileUploadConfig | undefined = question.fileUploadConfig;
    const inputRef = useRef<HTMLInputElement>(null);

    // Get saved answer
    const savedAnswer = question.response as FileUploadStudentAnswer | undefined;

    // Local state
    const [uploadedFile, setUploadedFile] = useState<{
        fileUrl: string;
        fileName: string;
        fileSize: number;
    } | null>(() => savedAnswer?.studentAnswer || null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Config defaults
    const maxFileSizeMB = fileUploadConfig?.maxFileSizeInMB || 10;
    const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

    const allowedTypes = React.useMemo(
        () => fileUploadConfig?.allowedFileTypes || [],
        [fileUploadConfig?.allowedFileTypes]
    );

    // Validate file
    const validateFile = useCallback(
        (file: File): string | null => {
            // Check file size
            if (file.size > maxFileSizeBytes) {
                return `File size exceeds ${maxFileSizeMB}MB limit`;
            }

            // Check file type if restrictions exist
            if (allowedTypes.length > 0) {
                const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
                const mimeType = file.type;

                const isAllowed = allowedTypes.some((type) => {
                    // Check extension match
                    if (type.startsWith(".")) {
                        return ext === type.toLowerCase();
                    }
                    // Check MIME type match (e.g., "image/*")
                    if (type.includes("*")) {
                        const baseType = type.split("/")[0];
                        return mimeType.startsWith(baseType);
                    }
                    // Exact MIME match
                    return mimeType === type;
                });

                if (!isAllowed) {
                    return `File type not allowed. Accepted: ${allowedTypes.join(", ")}`;
                }
            }

            return null;
        },
        [allowedTypes, maxFileSizeBytes, maxFileSizeMB]
    );

    // Handle file upload
    const handleFileUpload = useCallback(
        async (file: File) => {
            setError(null);

            // Validate
            const validationError = validateFile(file);
            if (validationError) {
                setError(validationError);
                return;
            }

            setIsUploading(true);
            setUploadProgress(0);

            try {
                // Simulate upload progress (replace with actual upload logic)
                // In a real implementation, you would upload to your storage service
                const progressInterval = setInterval(() => {
                    setUploadProgress((prev) => {
                        if (prev >= 90) {
                            clearInterval(progressInterval);
                            return 90;
                        }
                        return prev + 10;
                    });
                }, 100);

                // TODO: Replace with actual file upload API call
                // For now, we'll create a local object URL as placeholder
                const fileUrl = URL.createObjectURL(file);

                // Simulate network delay
                await new Promise((resolve) => setTimeout(resolve, 1000));

                clearInterval(progressInterval);
                setUploadProgress(100);

                const fileData = {
                    fileUrl,
                    fileName: file.name,
                    fileSize: file.size,
                };

                setUploadedFile(fileData);

                // Save to answer
                const answer: FileUploadStudentAnswer = { studentAnswer: fileData };
                onAnswerChange(answer);
            } catch (err) {
                setError("Failed to upload file. Please try again.");
                console.error("Upload error:", err);
            } finally {
                setIsUploading(false);
            }
        },
        [validateFile, onAnswerChange]
    );

    // Handle file input change
    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                handleFileUpload(file);
            }
            // Reset input
            if (inputRef.current) {
                inputRef.current.value = "";
            }
        },
        [handleFileUpload]
    );

    // Handle drag events
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);

            const file = e.dataTransfer.files?.[0];
            if (file) {
                handleFileUpload(file);
            }
        },
        [handleFileUpload]
    );

    // Remove uploaded file
    const handleRemoveFile = useCallback(() => {
        setUploadedFile(null);
        setError(null);

        // Clear the answer
        const answer: FileUploadStudentAnswer = {
            studentAnswer: { fileUrl: "", fileName: "", fileSize: 0 },
        };
        onAnswerChange(answer);
    }, [onAnswerChange]);

    return (
        <div className="space-y-6">
            {/* Question metadata header */}
            <QuestionHeader question={question} />

            {/* Question content */}
            <div className="prose prose-sm max-w-none dark:prose-invert">
                <ContentPreview content={(question.question as string) || ""} />
            </div>

            {/* File requirements */}
            <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                    Max size: {maxFileSizeMB}MB
                </Badge>
                {allowedTypes.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                        Allowed: {allowedTypes.join(", ")}
                    </Badge>
                )}
            </div>

            {/* Upload area */}
            <div className="space-y-4">
                <Label>Upload your file</Label>

                {!uploadedFile && !isUploading && (
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-lg p-8 transition-colors",
                            isDragging
                                ? "border-primary bg-primary/5"
                                : "border-input hover:border-primary/50",
                            "cursor-pointer"
                        )}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                    >
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="p-3 rounded-full bg-muted">
                                <Upload className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-medium">
                                    Drop your file here or click to browse
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {allowedTypes.length > 0
                                        ? `Accepted formats: ${allowedTypes.join(", ")}`
                                        : "Any file format accepted"}
                                </p>
                            </div>
                            <Button type="button" variant="outline" size="sm">
                                Choose File
                            </Button>
                        </div>
                        <input
                            ref={inputRef}
                            type="file"
                            className="hidden"
                            onChange={handleInputChange}
                            accept={allowedTypes.length > 0 ? allowedTypes.join(",") : undefined}
                        />
                    </div>
                )}

                {/* Upload progress */}
                {isUploading && (
                    <div className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span className="text-sm font-medium">Uploading...</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground">{uploadProgress}% complete</p>
                    </div>
                )}

                {/* Uploaded file display */}
                {uploadedFile && !isUploading && (
                    <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            {getFileIcon(uploadedFile.fileName)}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{uploadedFile.fileName}</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatFileSize(uploadedFile.fileSize)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleRemoveFile}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error display */}
                {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            {/* Attached reference files (if any) */}
            {question.attachedFiles && question.attachedFiles.length > 0 && (
                <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Reference Files</Label>
                    <div className="space-y-2">
                        {question.attachedFiles.map((fileUrl, index) => (
                            <a
                                key={index}
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 rounded border hover:bg-muted transition-colors text-sm"
                            >
                                <File className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">Reference file {index + 1}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
