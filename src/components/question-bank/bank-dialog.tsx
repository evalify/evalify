"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BankListItem } from "@/types/bank";
import { trpc } from "@/lib/trpc/client";
import { z } from "zod";

const bankSchema = z.object({
    name: z.string().min(1, "Bank name is required").max(255),
    courseCode: z.string().max(50).optional(),
    semester: z.number().min(1).max(8),
});

type BankFormData = z.infer<typeof bankSchema>;

interface BankDialogProps {
    bank?: BankListItem;
    isOpen?: boolean;
    onClose?: (open: boolean) => void;
    mode?: "create" | "edit";
}

export function BankDialog({
    bank,
    isOpen: controlledIsOpen,
    onClose,
    mode = "create",
}: BankDialogProps) {
    const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
    const isOpen = controlledIsOpen ?? uncontrolledIsOpen;
    const setIsOpen = onClose ?? setUncontrolledIsOpen;
    const utils = trpc.useUtils();
    const { error, success } = useToast();

    const getInitialFormData = useCallback((): BankFormData => {
        if (bank && mode === "edit") {
            return {
                name: bank.name ?? "",
                courseCode: bank.courseCode ?? "",
                semester: bank.semester ?? 1,
            };
        }
        return {
            name: "",
            courseCode: "",
            semester: 1,
        };
    }, [bank, mode]);

    const [formData, setFormData] = useState<BankFormData>(getInitialFormData);

    const [errors, setErrors] = useState<Partial<Record<keyof BankFormData, string>>>({});

    // Reset form data when dialog opens or mode/bank changes
    // Using key prop on Dialog would be better, but we update state on visibility change
    useEffect(() => {
        if (isOpen) {
            const newFormData = getInitialFormData();
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFormData(newFormData);
            // Clear errors when opening in create mode
            if (mode === "create") {
                setErrors({});
            }
        }
    }, [isOpen, getInitialFormData, mode]);

    const resetForm = () => {
        setFormData({
            name: "",
            courseCode: "",
            semester: 1,
        });
        setErrors({});
    };

    const createBank = trpc.bank.create.useMutation({
        onSuccess: () => {
            success("Bank created successfully!");
            utils.bank.list.invalidate();
            resetForm();
            setIsOpen(false);
        },
        onError: (err) => {
            error(err.message || "Failed to create bank");
        },
    });

    const updateBank = trpc.bank.update.useMutation({
        onSuccess: () => {
            success("Bank updated successfully!");
            utils.bank.list.invalidate();
            setIsOpen(false);
        },
        onError: (err) => {
            error(err.message || "Failed to update bank");
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = bankSchema.safeParse(formData);

        if (!result.success) {
            const fieldErrors: Partial<Record<keyof BankFormData, string>> = {};
            result.error.issues.forEach((err) => {
                if (err.path[0]) {
                    fieldErrors[err.path[0] as keyof BankFormData] = err.message;
                }
            });
            setErrors(fieldErrors);
            return;
        }

        setErrors({});

        if (mode === "create") {
            createBank.mutate(result.data);
        } else if (mode === "edit" && bank) {
            updateBank.mutate({ ...result.data, id: bank.id });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {controlledIsOpen === undefined && (
                <DialogTrigger asChild>
                    <Button variant="outline" className="mb-4">
                        {mode === "create" ? "Add Bank" : "Edit Bank"}
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {mode === "create" ? "Add New Question Bank" : "Edit Question Bank"}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === "create"
                            ? "Fill in the details to create a new question bank."
                            : "Update the question bank information."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Bank Name *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Data Structures Question Bank"
                        />
                        {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="courseCode">Course Code</Label>
                        <Input
                            id="courseCode"
                            value={formData.courseCode}
                            onChange={(e) =>
                                setFormData({ ...formData, courseCode: e.target.value })
                            }
                            placeholder="e.g., CS101"
                        />
                        {errors.courseCode && (
                            <p className="text-sm text-red-600">{errors.courseCode}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="semester">Semester *</Label>
                        <Input
                            id="semester"
                            type="number"
                            min="1"
                            max="8"
                            value={formData.semester}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    semester: parseInt(e.target.value) || 1,
                                })
                            }
                        />
                        {errors.semester && (
                            <p className="text-sm text-red-600">{errors.semester}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            type="submit"
                            disabled={createBank.isPending || updateBank.isPending}
                        >
                            {mode === "create" ? "Create Bank" : "Update Bank"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
