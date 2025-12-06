"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface DeleteQuizDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    quizName: string;
    onConfirm: () => void;
    isDeleting?: boolean;
}

/**
 * Renders a confirmation dialog that requires typing the exact quiz name to confirm deletion.
 *
 * @param isOpen - Whether the dialog is currently open.
 * @param onOpenChange - Callback invoked with the new open state when the dialog is opened or closed.
 * @param quizName - The exact quiz name the user must type to confirm deletion.
 * @param onConfirm - Callback invoked when deletion is confirmed (only called if the typed name matches `quizName`).
 * @param isDeleting - When true, disables inputs and shows a deleting state on the confirm button.
 * @returns The dialog element that prompts the user to confirm and triggers deletion when validated.
 */
export function DeleteQuizDialog({
    isOpen,
    onOpenChange,
    quizName,
    onConfirm,
    isDeleting = false,
}: DeleteQuizDialogProps) {
    const [confirmationText, setConfirmationText] = useState("");

    const isConfirmationValid = confirmationText === quizName;

    const handleConfirm = () => {
        if (isConfirmationValid) {
            onConfirm();
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setConfirmationText("");
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-5 w-5" />
                        Delete Quiz
                    </DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently delete the quiz and all
                        associated data including questions, responses, and results.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="confirmation">
                            Type <span className="font-semibold">{quizName}</span> to confirm
                        </Label>
                        <Input
                            id="confirmation"
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            placeholder="Enter quiz name"
                            disabled={isDeleting}
                        />
                    </div>

                    {confirmationText && !isConfirmationValid && (
                        <p className="text-sm text-destructive">
                            Quiz name does not match. Please type exactly: {quizName}
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={!isConfirmationValid || isDeleting}
                    >
                        {isDeleting ? "Deleting..." : "Delete Quiz"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}