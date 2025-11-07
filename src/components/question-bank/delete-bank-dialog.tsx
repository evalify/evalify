"use client";

import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc/client";
import { ConfirmationDialog } from "@/components/ui/custom-alert-dialog";

interface DeleteBankDialogProps {
    bankId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function DeleteBankDialog({ bankId, isOpen, onClose }: DeleteBankDialogProps) {
    const toast = useToast();
    const utils = trpc.useUtils();

    const deleteBank = trpc.bank.delete.useMutation({
        onSuccess: () => {
            toast.success("Bank deleted successfully!");
            utils.bank.list.invalidate();
            onClose();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete bank");
        },
    });

    return (
        <ConfirmationDialog
            isOpen={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            title="Delete Question Bank"
            message="Are you sure you want to delete this question bank? This action cannot be undone and will also delete all questions in this bank."
            onAccept={() => deleteBank.mutate({ id: bankId })}
            confirmButtonText="Delete"
            cancelButtonText="Cancel"
        />
    );
}
