"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserCheck, Plus, Search, AlertTriangle, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface SemesterManagersModalProps {
    semesterId: string;
    onClose: () => void;
}

export function SemesterManagersModal({ semesterId, onClose }: SemesterManagersModalProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([]);

    const { track } = useAnalytics();
    const { success, error } = useToast();

    const { data: availableData } = trpc.semester.getAvailableManagers.useQuery({
        semesterId,
        searchTerm: searchTerm || undefined,
    });

    const availableManagers = availableData || [];

    const utils = trpc.useUtils();
    const addManager = trpc.semester.addManager.useMutation({
        onError: (err) => {
            console.error("Add manager error:", err);
            error(err.message || "Failed to add manager to semester");
        },
    });

    const toggleManagerSelection = (managerId: string) => {
        setSelectedManagerIds((prev) =>
            prev.includes(managerId) ? prev.filter((id) => id !== managerId) : [...prev, managerId]
        );
    };

    const handleAddManagers = async () => {
        if (selectedManagerIds.length === 0) {
            error("Please select at least one manager to add");
            return;
        }

        setIsLoading(true);
        try {
            await Promise.all(
                selectedManagerIds.map((managerId) =>
                    addManager.mutateAsync({ semesterId, managerId })
                )
            );

            utils.semester.getManagers.invalidate({ semesterId });
            utils.semester.getAvailableManagers.invalidate({ semesterId });

            success(
                `Successfully added ${selectedManagerIds.length} manager${
                    selectedManagerIds.length !== 1 ? "s" : ""
                } to semester`
            );

            track("semester_managers_added", {
                semesterId,
                count: selectedManagerIds.length,
            });

            setSelectedManagerIds([]);
            onClose();
        } catch (err) {
            console.error("Error adding managers:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">Add Managers to Semester</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Select managers to assign to this semester
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search managers by name, email, or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>

                        {selectedManagerIds.length > 0 && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                                <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                {selectedManagerIds.length} manager
                                {selectedManagerIds.length !== 1 ? "s" : ""} selected
                            </div>
                        )}

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {availableManagers.length === 0 ? (
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        {searchTerm
                                            ? `No managers found matching "${searchTerm}"`
                                            : "All active managers are already assigned to this semester"}
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                availableManagers.map((managerUser) => (
                                    <div
                                        key={managerUser.id}
                                        onClick={() => toggleManagerSelection(managerUser.id)}
                                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                                            selectedManagerIds.includes(managerUser.id)
                                                ? "bg-blue-50 dark:bg-blue-950 border-blue-500"
                                                : "hover:bg-gray-50 dark:hover:bg-gray-800"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                checked={selectedManagerIds.includes(
                                                    managerUser.id
                                                )}
                                                onCheckedChange={() =>
                                                    toggleManagerSelection(managerUser.id)
                                                }
                                            />
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                                                <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                                    {managerUser.name}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {managerUser.email} • {managerUser.profileId}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button onClick={onClose} variant="outline" disabled={isLoading}>
                    Cancel
                </Button>
                <Button
                    onClick={handleAddManagers}
                    disabled={isLoading || selectedManagerIds.length === 0}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add {selectedManagerIds.length > 0 ? `(${selectedManagerIds.length})` : ""}
                </Button>
            </div>
        </div>
    );
}
