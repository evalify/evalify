"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SemesterFormData {
    name: string;
    year: number;
    departmentId: string;
    isActive: "ACTIVE" | "INACTIVE";
}

interface SemesterFormProps {
    initialData?: {
        id: string;
        name: string;
        year: number;
        departmentId: string;
        isActive: "ACTIVE" | "INACTIVE";
    } | null;
    onSubmit: (data: SemesterFormData) => Promise<void>;
    onCancel: () => void;
}

export function SemesterForm({ initialData, onSubmit, onCancel }: SemesterFormProps) {
    const [formData, setFormData] = useState<SemesterFormData>({
        name: "",
        year: new Date().getFullYear(),
        departmentId: "",
        isActive: "ACTIVE",
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Fetch departments for selection
    const { data: departmentsData } = trpc.department.list.useQuery({});
    const departments = departmentsData?.departments || [];

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                year: initialData.year,
                departmentId: initialData.departmentId,
                isActive: initialData.isActive,
            });
        }
    }, [initialData]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        const currentYear = new Date().getFullYear();

        if (!formData.name.trim()) {
            newErrors.name = "Semester name is required";
        } else if (formData.name.trim().length < 2) {
            newErrors.name = "Semester name must be at least 2 characters";
        }

        if (formData.year < currentYear - 10) {
            newErrors.year = "Year cannot be too far in the past";
        } else if (formData.year > currentYear + 10) {
            newErrors.year = "Year cannot be too far in the future";
        }

        if (!formData.departmentId || formData.departmentId === "") {
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
                name: formData.name.trim(),
                year: formData.year,
                departmentId: formData.departmentId,
                isActive: formData.isActive,
            });
        } catch (error) {
            console.error("Error submitting form:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof SemesterFormData, value: string | number) => {
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

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                {/* Semester Name */}
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                        Semester Name
                    </Label>
                    <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder="Enter semester name (e.g., Odd 2024 or Even 2025)"
                        className={errors.name ? "border-red-500" : ""}
                        disabled={isLoading}
                    />
                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>

                {/* Year */}
                <div className="space-y-2">
                    <Label htmlFor="year" className="text-sm font-medium">
                        Year
                    </Label>
                    <Input
                        id="year"
                        type="number"
                        value={formData.year}
                        onChange={(e) =>
                            handleInputChange(
                                "year",
                                parseInt(e.target.value) || new Date().getFullYear()
                            )
                        }
                        min={new Date().getFullYear() - 10}
                        max={new Date().getFullYear() + 10}
                        className={errors.year ? "border-red-500" : ""}
                        disabled={isLoading}
                    />
                    {errors.year && <p className="text-sm text-red-500">{errors.year}</p>}
                </div>

                {/* Department */}
                <div className="space-y-2">
                    <Label htmlFor="departmentId" className="text-sm font-medium">
                        Department <span className="text-red-500">*</span>
                    </Label>
                    <select
                        id="departmentId"
                        value={formData.departmentId}
                        onChange={(e) => handleInputChange("departmentId", e.target.value)}
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
                                ? "Semester is currently active"
                                : "Semester is currently inactive"}
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
                    disabled={isLoading || !formData.name.trim() || formData.departmentId === ""}
                    className="flex-1"
                >
                    {isLoading ? "Saving..." : initialData ? "Update" : "Create"}
                </Button>
            </div>
        </form>
    );
}
