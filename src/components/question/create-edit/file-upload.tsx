"use client";

import { FileUploadQuestion } from "@/types/questions";
import { TiptapEditor } from "@/components/rich-text-editor/editor";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Settings, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface FileUploadComponentProps {
    value: FileUploadQuestion;
    onChange: (question: FileUploadQuestion) => void;
}

export default function FileUploadComponent({ value, onChange }: FileUploadComponentProps) {
    const [newAttachmentUrl, setNewAttachmentUrl] = useState("");

    const handleQuestionChange = (content: string) => {
        onChange({ ...value, question: content });
    };

    const handleConfigChange = <K extends keyof FileUploadQuestion["fileUploadConfig"]>(
        field: K,
        val: FileUploadQuestion["fileUploadConfig"][K]
    ) => {
        onChange({
            ...value,
            fileUploadConfig: {
                ...value.fileUploadConfig,
                [field]: val,
            },
        });
    };

    const addAttachment = () => {
        if (!newAttachmentUrl.trim()) return;
        onChange({
            ...value,
            attachedFiles: [...(value.attachedFiles || []), newAttachmentUrl.trim()],
        });
        setNewAttachmentUrl("");
    };

    const removeAttachment = (indexToRemove: number) => {
        onChange({
            ...value,
            attachedFiles: (value.attachedFiles || []).filter((_, idx) => idx !== indexToRemove),
        });
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
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Upload className="h-5 w-5 text-primary" />
                        Attachments (Optional)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter file URL..."
                            value={newAttachmentUrl}
                            onChange={(e) => setNewAttachmentUrl(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    addAttachment();
                                }
                            }}
                        />
                        <Button onClick={addAttachment} variant="secondary">
                            Add
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {(value.attachedFiles || []).map((url, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-2 rounded-md border bg-muted/50"
                            >
                                <span className="text-sm truncate max-w-[80%]">{url}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeAttachment(idx)}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        {(!value.attachedFiles || value.attachedFiles.length === 0) && (
                            <p className="text-sm text-muted-foreground italic">
                                No files attached. Added files will be downloadable by students.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        Advanced Settings
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="allowed-types">Allowed File Formats</Label>
                            <Input
                                id="allowed-types"
                                placeholder="e.g. .pdf, .docx, .png"
                                value={value.fileUploadConfig.allowedFileTypes?.join(", ") || ""}
                                onChange={(e) => {
                                    const types = e.target.value
                                        .split(",")
                                        .map((t) => t.trim())
                                        .filter(Boolean);
                                    handleConfigChange("allowedFileTypes", types);
                                }}
                            />
                            <p className="text-xs text-muted-foreground">
                                Comma-separated list of extensions. Leave empty to allow all.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="max-size">Maximum File Size (MB)</Label>
                            <Input
                                id="max-size"
                                type="number"
                                min="1"
                                placeholder="e.g. 10"
                                value={value.fileUploadConfig.maxFileSizeInMB || ""}
                                onChange={(e) =>
                                    handleConfigChange(
                                        "maxFileSizeInMB",
                                        parseInt(e.target.value) || undefined
                                    )
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="max-files">Number of Files</Label>
                            <Input
                                id="max-files"
                                type="number"
                                min="1"
                                max="10"
                                value={value.fileUploadConfig.maxFiles || 1}
                                onChange={(e) =>
                                    handleConfigChange("maxFiles", parseInt(e.target.value) || 1)
                                }
                            />
                            <p className="text-xs text-muted-foreground">Default is 1.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
