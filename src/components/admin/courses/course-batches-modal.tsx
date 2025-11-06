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

interface CourseBatchesModalProps {
    courseId: number;
    onClose: () => void;
}

export function CourseBatchesModal({ courseId, onClose }: CourseBatchesModalProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const { track } = useAnalytics();
    const { success, error } = useToast();

    // Queries
    const { data: batchesData, isLoading: loadingBatches } = trpc.course.getBatches.useQuery({
        courseId,
    });

    const { data: availableData } = trpc.course.getAvailableBatches.useQuery({
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
            success("Batch removed from course successfully");
        },
        onError: (err) => {
            console.error("Remove batch error:", err);
            error(err.message || "Failed to remove batch from course");
        },
    });

    const handleAddBatch = async (batchId: number) => {
        setIsLoading(true);
        try {
            await addBatch.mutateAsync({ courseId, batchId });
            track("course_batch_added", { courseId, batchId });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveBatch = async (batchId: number) => {
        if (confirm("Are you sure you want to remove this batch from the course?")) {
            setIsLoading(true);
            try {
                await removeBatch.mutateAsync({ courseId, batchId });
                track("course_batch_removed", { courseId, batchId });
            } finally {
                setIsLoading(false);
            }
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
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>

                        {/* Available Batches */}
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {availableBatches.length === 0 ? (
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
        </div>
    );
}
