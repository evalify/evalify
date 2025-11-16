"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X } from "lucide-react";

interface Department {
    id: string;
    name: string;
    isActive: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date | null;
}

interface DepartmentFormProps {
    initialData?: Department | null;
    onSubmit: (data: { name: string; isActive: "ACTIVE" | "INACTIVE" }) => Promise<void>;
    onCancel: () => void;
}

export function DepartmentForm({ initialData, onSubmit, onCancel }: DepartmentFormProps) {
    const [formData, setFormData] = useState({
        name: "",
        isActive: "ACTIVE" as "ACTIVE" | "INACTIVE",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Populate form with initial data if editing
    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                isActive: initialData.isActive,
            });
        }
    }, [initialData]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        // Validate name
        if (!formData.name.trim()) {
            newErrors.name = "Department name is required";
        } else if (formData.name.trim().length < 2) {
            newErrors.name = "Department name must be at least 2 characters";
        } else if (formData.name.trim().length > 100) {
            newErrors.name = "Department name must be less than 100 characters";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit({
                name: formData.name.trim(),
                isActive: formData.isActive,
            });
        } catch {
            setErrors({
                submit: "Failed to save department. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));

        // Clear field-specific error when user starts typing
        if (errors[field]) {
            setErrors((prev) => ({
                ...prev,
                [field]: "",
            }));
        }
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Department Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Department Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-medium">
                                Department Name *
                            </Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Enter department name"
                                value={formData.name}
                                onChange={(e) => handleInputChange("name", e.target.value)}
                                className={`${
                                    errors.name
                                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                        : ""
                                }`}
                                disabled={isSubmitting}
                            />
                            {errors.name && (
                                <p className="text-sm text-red-600 dark:text-red-400">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <Label htmlFor="status" className="text-sm font-medium">
                                Status *
                            </Label>
                            <select
                                id="status"
                                value={formData.isActive}
                                onChange={(e) =>
                                    handleInputChange(
                                        "isActive",
                                        e.target.value as "ACTIVE" | "INACTIVE"
                                    )
                                }
                                disabled={isSubmitting}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>

                        {/* Submit Error */}
                        {errors.submit && (
                            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3">
                                <p className="text-sm text-red-600 dark:text-red-400">
                                    {errors.submit}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="min-w-[100px]"
                    >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="min-w-[100px] bg-black hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {isSubmitting
                            ? "Saving..."
                            : initialData
                              ? "Update Department"
                              : "Create Department"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
