"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, FileQuestion } from "lucide-react";
import { MCQUploadDialog } from "@/components/question-bank/mcq-upload-dialog";

interface UploadQuestionsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTopics: Array<{ id: string; name: string }>;
    bankId: string;
}

export function UploadQuestionsDialog({
    isOpen,
    onClose,
    selectedTopics,
    bankId,
}: UploadQuestionsDialogProps) {
    const [isMCQDialogOpen, setIsMCQDialogOpen] = useState(false);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5" />
                            Upload Questions
                        </DialogTitle>
                        <DialogDescription>
                            Upload questions in bulk using Excel format. Select the question type to
                            proceed.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Description */}
                        <div className="rounded-lg border bg-muted/50 p-4">
                            <h4 className="text-sm font-medium mb-2">About Excel Upload</h4>
                            <p className="text-sm text-muted-foreground">
                                You can upload multiple questions at once using an Excel file. Each
                                question type has a specific format that needs to be followed.
                                Download the template for your chosen question type to get started.
                            </p>
                        </div>

                        {/* Selected Topics */}
                        {selectedTopics.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">Questions will be added to:</h4>
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

                        {/* Question Types */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium">Select Question Type:</h4>
                            <div className="grid gap-3">
                                {/* MCQ Button */}
                                <Button
                                    variant="outline"
                                    className="h-auto py-4 justify-start hover:bg-accent hover:border-primary"
                                    onClick={() => setIsMCQDialogOpen(true)}
                                >
                                    <div className="flex items-center gap-3 w-full">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                                            <FileQuestion className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="font-semibold">
                                                Multiple Choice Questions (MCQ)
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Upload questions with multiple options and one
                                                correct answer
                                            </div>
                                        </div>
                                    </div>
                                </Button>

                                {/* Placeholder for other question types */}
                                <div className="text-center py-4 text-sm text-muted-foreground italic">
                                    More question types coming soon...
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* MCQ Upload Dialog */}
            <MCQUploadDialog
                isOpen={isMCQDialogOpen}
                onClose={() => setIsMCQDialogOpen(false)}
                selectedTopics={selectedTopics}
                bankId={bankId}
            />
        </>
    );
}
