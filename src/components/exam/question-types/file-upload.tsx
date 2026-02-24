"use client";

import React, { useState, useCallback, useRef, useMemo } from "react";
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
import type { FileUploadStudentAnswer, StudentFileUploadConfig } from "../lib/types";

interface FileUploadQuestionProps {
    question: QuizQuestion;
    onAnswerChange: (answer: FileUploadStudentAnswer) => void;
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"];
const DOCUMENT_EXTENSIONS = ["pdf", "doc", "docx", "txt", "rtf", "odt"];
const CODE_EXTENSIONS = ["js", "ts", "py", "java", "cpp", "c", "html", "css", "json"];
const ARCHIVE_EXTENSIONS = ["zip", "rar", "7z", "tar", "gz"];

function getFileIcon(fileName: string) {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";

    if (IMAGE_EXTENSIONS.includes(ext)) return <ImageIcon className="h-5 w-5 text-blue-500" />;
    if (DOCUMENT_EXTENSIONS.includes(ext)) return <FileText className="h-5 w-5 text-red-500" />;
    if (CODE_EXTENSIONS.includes(ext)) return <FileCode className="h-5 w-5 text-green-500" />;
    if (ARCHIVE_EXTENSIONS.includes(ext))
        return <FileArchive className="h-5 w-5 text-yellow-500" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function FileUploadQuestion({ question, onAnswerChange }: FileUploadQuestionProps) {
    const fileUploadConfig = question.fileUploadConfig as StudentFileUploadConfig | undefined;
    const inputRef = useRef<HTMLInputElement>(null);
    const objectUrlRef = useRef<string | null>(null);

    const savedAnswer = question.response as FileUploadStudentAnswer | undefined;

    const [uploadedFile, setUploadedFile] = useState<{
        fileUrl: string;
        fileName: string;
        fileSize: number;
    } | null>(() => savedAnswer?.studentAnswer || null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const maxFileSizeMB = fileUploadConfig?.maxFileSizeInMB || 10;
    const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

    const allowedTypes = useMemo(
        () => fileUploadConfig?.allowedFileTypes || [],
        [fileUploadConfig?.allowedFileTypes]
    );

    const validateFile = useCallback(
        (file: File): string | null => {
            if (file.size > maxFileSizeBytes) {
                return `File size exceeds ${maxFileSizeMB}MB limit`;
            }

            if (allowedTypes.length > 0) {
                const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
                const mimeType = file.type;

                const isAllowed = allowedTypes.some((type) => {
                    if (type.startsWith(".")) return ext === type.toLowerCase();
                    if (type.includes("*")) return mimeType.startsWith(type.split("/")[0]);
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

    const handleFileUpload = useCallback(
        async (file: File) => {
            setError(null);

            const validationError = validateFile(file);
            if (validationError) {
                setError(validationError);
                return;
            }

            setIsUploading(true);
            setUploadProgress(0);

            try {
                const progressInterval = setInterval(() => {
                    setUploadProgress((prev) => {
                        if (prev >= 90) {
                            clearInterval(progressInterval);
                            return 90;
                        }
                        return prev + 10;
                    });
                }, 100);

                // TODO: Replace with actual file upload API call to MinIO
                const fileUrl = URL.createObjectURL(file);
                if (objectUrlRef.current) {
                    URL.revokeObjectURL(objectUrlRef.current);
                }
                objectUrlRef.current = fileUrl;

                await new Promise((resolve) => setTimeout(resolve, 1000));

                clearInterval(progressInterval);
                setUploadProgress(100);

                const fileData = {
                    fileUrl,
                    fileName: file.name,
                    fileSize: file.size,
                };

                setUploadedFile(fileData);
                onAnswerChange({ studentAnswer: fileData });
            } catch {
                setError("Failed to upload file. Please try again.");
            } finally {
                setIsUploading(false);
            }
        },
        [validateFile, onAnswerChange]
    );

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            if (inputRef.current) inputRef.current.value = "";
        },
        [handleFileUpload]
    );

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
            if (file) handleFileUpload(file);
        },
        [handleFileUpload]
    );

    const handleRemoveFile = useCallback(() => {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
        setUploadedFile(null);
        setError(null);
        onAnswerChange({
            studentAnswer: { fileUrl: "", fileName: "", fileSize: 0 },
        });
    }, [onAnswerChange]);

    React.useEffect(() => {
        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
        };
    }, []);

    return (
        <div className="space-y-6">
            <QuestionHeader question={question} />

            <div className="prose prose-sm max-w-none dark:prose-invert">
                <ContentPreview content={(question.question as string) || ""} />
            </div>

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

            <div className="space-y-4">
                <Label>Upload your file</Label>

                {!uploadedFile && !isUploading && (
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer",
                            isDragging
                                ? "border-primary bg-primary/5"
                                : "border-input hover:border-primary/50"
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

                {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
            </div>

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
