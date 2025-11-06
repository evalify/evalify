"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface CourseFormData {
    name: string;
    description: string;
    code: string;
    image?: string;
    type: "CORE" | "ELECTIVE" | "MICRO_CREDENTIAL";
    semesterId: number;
    isActive: "ACTIVE" | "INACTIVE";
}

interface Semester {
    id: number;
    name: string;
    year: number;
    isActive: "ACTIVE" | "INACTIVE";
}

interface CourseFormProps {
    semesters?: Semester[];
    fixedSemesterId?: number;
    initialData?: {
        id: number;
        name: string;
        description: string;
        code: string;
        image?: string;
        type: "CORE" | "ELECTIVE" | "MICRO_CREDENTIAL";
        semesterId: number;
        isActive: "ACTIVE" | "INACTIVE";
    } | null;
    onSubmit: (data: CourseFormData) => Promise<void>;
    onCancel: () => void;
}

const COURSE_TYPES = [
    { value: "CORE", label: "Core" },
    { value: "ELECTIVE", label: "Elective" },
    { value: "MICRO_CREDENTIAL", label: "Micro Credential" },
] as const;

export function CourseForm({
    semesters,
    fixedSemesterId,
    initialData,
    onSubmit,
    onCancel,
}: CourseFormProps) {
    const [formData, setFormData] = useState<CourseFormData>({
        name: "",
        description: "",
        code: "",
        image: "",
        type: "CORE",
        semesterId: fixedSemesterId || semesters?.[0]?.id || 0,
        isActive: "ACTIVE",
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                description: initialData.description,
                code: initialData.code,
                image: initialData.image || "",
                type: initialData.type,
                semesterId: initialData.semesterId,
                isActive: initialData.isActive,
            });
        }
    }, [initialData]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = "Course name is required";
        } else if (formData.name.trim().length < 2) {
            newErrors.name = "Course name must be at least 2 characters";
        }

        if (!formData.description.trim()) {
            newErrors.description = "Course description is required";
        } else if (formData.description.trim().length < 10) {
            newErrors.description = "Course description must be at least 10 characters";
        }

        if (!formData.code.trim()) {
            newErrors.code = "Course code is required";
        } else if (formData.code.trim().length < 2) {
            newErrors.code = "Course code must be at least 2 characters";
        }

        if (!fixedSemesterId && !formData.semesterId) {
            newErrors.semesterId = "Semester is required";
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
                description: formData.description.trim(),
                code: formData.code.trim().toUpperCase(),
                image: formData.image?.trim() || undefined,
                type: formData.type,
                semesterId: formData.semesterId,
                isActive: formData.isActive,
            });
        } catch (error) {
            console.error("Error submitting form:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof CourseFormData, value: string | number) => {
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
                {/* Course Name */}
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                        Course Name
                    </Label>
                    <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder="Enter course name"
                        className={errors.name ? "border-red-500" : ""}
                        disabled={isLoading}
                    />
                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>

                {/* Course Code */}
                <div className="space-y-2">
                    <Label htmlFor="code" className="text-sm font-medium">
                        Course Code
                    </Label>
                    <Input
                        id="code"
                        type="text"
                        value={formData.code}
                        onChange={(e) => handleInputChange("code", e.target.value)}
                        placeholder="Enter course code (e.g., CS101)"
                        className={errors.code ? "border-red-500" : ""}
                        disabled={isLoading}
                    />
                    {errors.code && <p className="text-sm text-red-500">{errors.code}</p>}
                </div>

                {/* Course Description */}
                <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">
                        Course Description
                    </Label>
                    <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        placeholder="Enter course description"
                        className={errors.description ? "border-red-500" : ""}
                        disabled={isLoading}
                        rows={4}
                    />
                    {errors.description && (
                        <p className="text-sm text-red-500">{errors.description}</p>
                    )}
                </div>

                {/* Course Type */}
                <div className="space-y-2">
                    <Label htmlFor="type" className="text-sm font-medium">
                        Course Type
                    </Label>
                    <select
                        id="type"
                        value={formData.type}
                        onChange={(e) =>
                            handleInputChange("type", e.target.value as CourseFormData["type"])
                        }
                        className="w-full px-3 py-2 border rounded-md bg-background text-foreground border-input"
                        disabled={isLoading}
                    >
                        {COURSE_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Semester */}
                {!fixedSemesterId && semesters && (
                    <div className="space-y-2">
                        <Label htmlFor="semesterId" className="text-sm font-medium">
                            Semester
                        </Label>
                        <select
                            id="semesterId"
                            value={formData.semesterId}
                            onChange={(e) => handleInputChange("semesterId", e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md bg-background text-foreground ${
                                errors.semesterId ? "border-red-500" : "border-input"
                            }`}
                            disabled={isLoading}
                        >
                            <option value="">Select a semester</option>
                            {semesters
                                .filter((semester) => semester.isActive === "ACTIVE")
                                .map((semester) => (
                                    <option key={semester.id} value={semester.id}>
                                        {semester.name} ({semester.year})
                                    </option>
                                ))}
                        </select>
                        {errors.semesterId && (
                            <p className="text-sm text-red-500">{errors.semesterId}</p>
                        )}
                    </div>
                )}

                {/* Course Image (Optional) */}
                <div className="space-y-2">
                    <Label htmlFor="image" className="text-sm font-medium">
                        Course Image URL (Optional)
                    </Label>
                    <Input
                        id="image"
                        type="url"
                        value={formData.image}
                        onChange={(e) => handleInputChange("image", e.target.value)}
                        placeholder="Enter image URL"
                        disabled={isLoading}
                    />
                    <p className="text-xs text-gray-500">
                        Provide a URL to an image that represents this course
                    </p>
                </div>

                {/* Status Toggle */}
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="status" className="text-sm font-medium">
                            Active Status
                        </Label>
                        <p className="text-xs text-gray-500">
                            {formData.isActive === "ACTIVE"
                                ? "Course is currently active"
                                : "Course is currently inactive"}
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
                        !formData.name.trim() ||
                        !formData.description.trim() ||
                        !formData.code.trim() ||
                        !formData.semesterId
                    }
                    className="flex-1"
                >
                    {isLoading ? "Saving..." : initialData ? "Update" : "Create"}
                </Button>
            </div>
        </form>
    );
}
