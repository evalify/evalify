"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface BatchFormData {
    name: string;
    joinYear: number;
    graduationYear: number;
    section: string;
    departmentId: number;
    isActive: "ACTIVE" | "INACTIVE";
}

interface Department {
    id: number;
    name: string;
    isActive: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date | null;
}

interface BatchFormProps {
    departments: Department[];
    initialData?: {
        id: number;
        name: string;
        joinYear: number;
        graduationYear: number;
        section: string;
        departmentId: number;
        isActive: "ACTIVE" | "INACTIVE";
    } | null;
    onSubmit: (data: BatchFormData) => Promise<void>;
    onCancel: () => void;
}

export function BatchForm({ departments, initialData, onSubmit, onCancel }: BatchFormProps) {
    const [formData, setFormData] = useState<BatchFormData>({
        name: "",
        joinYear: new Date().getFullYear(),
        graduationYear: new Date().getFullYear() + 4,
        section: "",
        departmentId: departments[0]?.id || 0,
        isActive: "ACTIVE",
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                joinYear: initialData.joinYear,
                graduationYear: initialData.graduationYear,
                section: initialData.section,
                departmentId: initialData.departmentId,
                isActive: initialData.isActive,
            });
        }
    }, [initialData]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        const currentYear = new Date().getFullYear();

        if (!formData.joinYear) {
            newErrors.joinYear = "Join year is required";
        } else if (formData.joinYear < currentYear - 10) {
            newErrors.joinYear = "Join year cannot be more than 10 years in the past";
        } else if (formData.joinYear > currentYear + 5) {
            newErrors.joinYear = "Join year cannot be more than 5 years in the future";
        }

        if (!formData.section.trim()) {
            newErrors.section = "Section is required";
        } else if (formData.section.trim().length < 1) {
            newErrors.section = "Section must be at least 1 character";
        }

        if (formData.graduationYear < formData.joinYear) {
            newErrors.graduationYear = "Graduation year must be after join year";
        } else if (formData.graduationYear > formData.joinYear + 10) {
            newErrors.graduationYear = "Graduation year is too far from join year";
        }

        if (!formData.departmentId) {
            newErrors.departmentId = "Department is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        try {
            await onSubmit({
                name: generateBatchName(),
                joinYear: formData.joinYear,
                graduationYear: formData.graduationYear,
                section: formData.section.trim(),
                departmentId: formData.departmentId,
                isActive: formData.isActive,
            });
        } catch (error) {
            console.error("Error submitting form:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof BatchFormData, value: string | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };

    const handleStatusToggle = (checked: boolean) => {
        setFormData((prev) => ({
            ...prev,
            isActive: checked ? "ACTIVE" : "INACTIVE",
        }));
    };

    // Generate batch name preview
    const generateBatchName = () => {
        const selectedDepartment = departments.find((dept) => dept.id === formData.departmentId);
        if (selectedDepartment && formData.joinYear && formData.section.trim()) {
            return `${formData.joinYear}${selectedDepartment.name}${formData.section.trim()}`;
        }
        return "Batch name will be auto-generated";
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                {/* Auto-generated Batch Name Preview */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Batch Name (Auto-generated)</Label>
                    <div className="px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {generateBatchName()}
                    </div>
                    <p className="text-xs text-gray-500">
                        Generated from: Join Year + Department + Section
                    </p>
                </div>

                {/* Join Year */}
                <div className="space-y-2">
                    <Label htmlFor="joinYear" className="text-sm font-medium">
                        Join Year
                    </Label>
                    <Input
                        id="joinYear"
                        type="number"
                        value={formData.joinYear}
                        onChange={(e) => handleInputChange("joinYear", parseInt(e.target.value))}
                        min={new Date().getFullYear() - 10}
                        max={new Date().getFullYear() + 5}
                        className={errors.joinYear ? "border-red-500" : ""}
                        disabled={isLoading}
                    />
                    {errors.joinYear && <p className="text-sm text-red-500">{errors.joinYear}</p>}
                </div>

                {/* Section */}
                <div className="space-y-2">
                    <Label htmlFor="section" className="text-sm font-medium">
                        Section
                    </Label>
                    <Input
                        id="section"
                        type="text"
                        value={formData.section}
                        onChange={(e) => handleInputChange("section", e.target.value)}
                        placeholder="Enter section (e.g., A, B, C)"
                        className={errors.section ? "border-red-500" : ""}
                        disabled={isLoading}
                    />
                    {errors.section && <p className="text-sm text-red-500">{errors.section}</p>}
                </div>

                {/* Graduation Year */}
                <div className="space-y-2">
                    <Label htmlFor="graduationYear" className="text-sm font-medium">
                        Graduation Year
                    </Label>
                    <Input
                        id="graduationYear"
                        type="number"
                        value={formData.graduationYear}
                        onChange={(e) =>
                            handleInputChange("graduationYear", parseInt(e.target.value))
                        }
                        min={new Date().getFullYear()}
                        max={new Date().getFullYear() + 10}
                        className={errors.graduationYear ? "border-red-500" : ""}
                        disabled={isLoading}
                    />
                    {errors.graduationYear && (
                        <p className="text-sm text-red-500">{errors.graduationYear}</p>
                    )}
                </div>

                {/* Department */}
                <div className="space-y-2">
                    <Label htmlFor="departmentId" className="text-sm font-medium">
                        Department
                    </Label>
                    <select
                        id="departmentId"
                        value={formData.departmentId}
                        onChange={(e) =>
                            handleInputChange("departmentId", parseInt(e.target.value))
                        }
                        className={`w-full px-3 py-2 border rounded-md bg-background text-foreground ${
                            errors.departmentId ? "border-red-500" : "border-input"
                        }`}
                        disabled={isLoading}
                    >
                        <option value="">Select a department</option>
                        {departments
                            .filter((dept) => dept.isActive === "ACTIVE")
                            .map((department) => (
                                <option key={department.id} value={department.id}>
                                    {department.name}
                                </option>
                            ))}
                    </select>
                    {errors.departmentId && (
                        <p className="text-sm text-red-500">{errors.departmentId}</p>
                    )}
                </div>

                {/* Status Toggle */}
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="status" className="text-sm font-medium">
                            Active Status
                        </Label>
                        <p className="text-xs text-gray-500">
                            {formData.isActive === "ACTIVE"
                                ? "Batch is currently active"
                                : "Batch is currently inactive"}
                        </p>
                    </div>
                    <Switch
                        id="status"
                        checked={formData.isActive === "ACTIVE"}
                        onCheckedChange={handleStatusToggle}
                        disabled={isLoading}
                    />
                </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4 border-t">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex-1"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={
                        isLoading ||
                        !formData.joinYear ||
                        !formData.section.trim() ||
                        !formData.departmentId
                    }
                    className="flex-1"
                >
                    {isLoading ? "Saving..." : initialData ? "Update" : "Create"}
                </Button>
            </div>
        </form>
    );
}
