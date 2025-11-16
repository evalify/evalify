"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Plus, X, Search, AlertTriangle } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/custom-alert-dialog";

interface CourseBatchesModalProps {
    courseId: string;
    onClose: () => void;
}

export function CourseBatchesModal({ courseId, onClose }: CourseBatchesModalProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Confirmation dialog state
    const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
    const [batchToRemove, setBatchToRemove] = useState<string | null>(null);

    const { track } = useAnalytics();
    const { success, error } = useToast();

    // Queries
    const { data: batchesData, isLoading: loadingBatches } = trpc.course.getBatches.useQuery({
        courseId,
    });

    const { data: availableData, isLoading: loadingAvailable } =
        trpc.course.getAvailableBatches.useQuery({
            courseId,
            searchTerm: searchTerm || undefined,
        });

    const batches = batchesData || [];
    const availableBatches = availableData || [];

    // Mutations
    const utils = trpc.useUtils();
    const addBatch = trpc.course.addBatch.useMutation({
        onSuccess: () => {
            utils.course.getBatches.invalidate({ courseId });
            utils.course.getAvailableBatches.invalidate({ courseId });
            // Invalidate student queries since batch students are now enrolled
            utils.course.getStudents.invalidate({ courseId });
            utils.course.getAvailableStudents.invalidate({ courseId });
            success("Batch added to course successfully");
        },
        onError: (err) => {
            console.error("Add batch error:", err);
            error(err.message || "Failed to add batch to course");
        },
    });

    const removeBatch = trpc.course.removeBatch.useMutation({
        onSuccess: () => {
            utils.course.getBatches.invalidate({ courseId });
            utils.course.getAvailableBatches.invalidate({ courseId });
            // Invalidate student queries since batch students are no longer enrolled
            utils.course.getStudents.invalidate({ courseId });
            utils.course.getAvailableStudents.invalidate({ courseId });
            success("Batch removed from course successfully");
        },
        onError: (err) => {
            console.error("Remove batch error:", err);
            error(err.message || "Failed to remove batch from course");
        },
    });

    const handleAddBatch = async (batchId: string) => {
        setIsLoading(true);
        try {
            await addBatch.mutateAsync({ courseId, batchId });
            track("course_batch_added", { courseId, batchId });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveBatch = async (batchId: string) => {
        setBatchToRemove(batchId);
        setIsRemoveDialogOpen(true);
    };

    const confirmRemoveBatch = async () => {
        if (!batchToRemove) return;

        setIsLoading(true);
        try {
            await removeBatch.mutateAsync({ courseId, batchId: batchToRemove });
            track("course_batch_removed", { courseId, batchId: batchToRemove });
        } finally {
            setIsLoading(false);
            setIsRemoveDialogOpen(false);
            setBatchToRemove(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Current Batches */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">Assigned Batches</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {batches.length} batch{batches.length !== 1 ? "es" : ""} assigned
                    </p>
                </CardHeader>
                <CardContent>
                    {loadingBatches ? (
                        <p className="text-sm text-muted-foreground">Loading batches...</p>
                    ) : batches.length === 0 ? (
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                No batches are currently assigned to this course.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-3">
                            {batches.map((batch) => (
                                <div
                                    key={batch.id}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
                                            <GraduationCap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                                {batch.name}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {batch.section} • {batch.joinYear} -{" "}
                                                {batch.graduationYear}
                                            </div>
                                            {batch.departmentName && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {batch.departmentName}
                                                </div>
                                            )}
                                        </div>
                                        <Badge variant="secondary">
                                            {batch.graduationYear - batch.joinYear} Year Program
                                        </Badge>
                                    </div>
                                    <Button
                                        onClick={() => handleRemoveBatch(batch.id)}
                                        variant="outline"
                                        size="sm"
                                        disabled={isLoading}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add New Batches */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">Add Batches</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Search and assign batches to this course
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search batches by name, section, or year..."
                                aria-label="Search batches"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>

                        {/* Available Batches */}
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {loadingAvailable ? (
                                <p className="text-sm text-muted-foreground">
                                    Loading available batches...
                                </p>
                            ) : availableBatches.length === 0 ? (
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        {searchTerm
                                            ? `No batches found matching "${searchTerm}"`
                                            : "All active batches are already assigned to this course"}
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                availableBatches.map((batch) => (
                                    <div
                                        key={batch.id}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
                                                <GraduationCap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                                    {batch.name}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {batch.section} • {batch.joinYear} -{" "}
                                                    {batch.graduationYear}
                                                </div>
                                                {batch.departmentName && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {batch.departmentName}
                                                    </div>
                                                )}
                                            </div>
                                            <Badge variant="secondary">
                                                {batch.graduationYear - batch.joinYear} Year Program
                                            </Badge>
                                        </div>
                                        <Button
                                            onClick={() => handleAddBatch(batch.id)}
                                            variant="outline"
                                            size="sm"
                                            disabled={isLoading}
                                            className="text-green-600 hover:text-green-700"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end pt-4 border-t">
                <Button onClick={onClose} variant="outline">
                    Close
                </Button>
            </div>

            {/* Remove Batch Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={isRemoveDialogOpen}
                onOpenChange={setIsRemoveDialogOpen}
                title="Remove Batch"
                message="Are you sure you want to remove this batch from the course?"
                onAccept={confirmRemoveBatch}
                confirmButtonText="Remove"
                cancelButtonText="Cancel"
            />
        </div>
    );
}
