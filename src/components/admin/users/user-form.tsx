"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { User, X, Camera } from "lucide-react";

interface UserFormData {
    name: string;
    email: string;
    profileId: string;
    image?: string;
    role: "ADMIN" | "FACULTY" | "STUDENT" | "MANAGER";
    phoneNumber: string;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

interface UserFormProps {
    initialData?: {
        id: number;
        name: string;
        email: string;
        profileId: string;
        profileImage?: string | null;
        role: "ADMIN" | "FACULTY" | "STUDENT" | "MANAGER";
        phoneNumber: string | null;
        status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    } | null;
    onSubmit: (data: UserFormData) => Promise<void>;
    onCancel: () => void;
}

const USER_ROLES = [
    {
        value: "ADMIN",
        label: "Administrator",
        color: "bg-red-500",
        description: "Full system access",
    },
    {
        value: "FACULTY",
        label: "Faculty Member",
        color: "bg-blue-500",
        description: "Teaching and evaluation access",
    },
    {
        value: "STUDENT",
        label: "Student",
        color: "bg-green-500",
        description: "Take evaluations and view results",
    },
    {
        value: "MANAGER",
        label: "Manager",
        color: "bg-purple-500",
        description: "Departmental management access",
    },
] as const;

export function UserForm({ initialData, onSubmit, onCancel }: UserFormProps) {
    const [formData, setFormData] = useState<UserFormData>({
        name: "",
        email: "",
        profileId: "",
        image: "",
        role: "STUDENT",
        phoneNumber: "",
        status: "ACTIVE",
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [imagePreview, setImagePreview] = useState<string>("");
    const [_imageFile, setImageFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                email: initialData.email,
                profileId: initialData.profileId,
                image: initialData.profileImage || "",
                role: initialData.role,
                phoneNumber: initialData.phoneNumber || "",
                status: initialData.status,
            });
            if (initialData.profileImage) {
                setImagePreview(initialData.profileImage);
            }
        }
    }, [initialData]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = "Full name is required";
        } else if (formData.name.trim().length < 2) {
            newErrors.name = "Name must be at least 2 characters";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email address is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Please enter a valid email address";
        }

        if (!formData.profileId.trim()) {
            newErrors.profileId = "Profile ID is required";
        } else if (formData.profileId.trim().length < 3) {
            newErrors.profileId = "Profile ID must be at least 3 characters";
        }

        if (!formData.phoneNumber.trim()) {
            newErrors.phoneNumber = "Phone number is required";
        } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phoneNumber)) {
            newErrors.phoneNumber = "Please enter a valid phone number";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            setErrors((prev) => ({
                ...prev,
                image: "Please select a valid image file",
            }));
            return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            setErrors((prev) => ({
                ...prev,
                image: "Image size must be less than 5MB",
            }));
            return;
        }

        setImageFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            setImagePreview(result);
            setFormData((prev) => ({ ...prev, image: result }));
        };
        reader.readAsDataURL(file);

        // Clear any previous errors
        setErrors((prev) => ({ ...prev, image: "" }));
    };

    const removeImage = () => {
        setImagePreview("");
        setImageFile(null);
        setFormData((prev) => ({ ...prev, image: "" }));
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
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
                email: formData.email.trim().toLowerCase(),
                profileId: formData.profileId.trim(),
                image: formData.image?.trim() || undefined,
                role: formData.role,
                phoneNumber: formData.phoneNumber.trim(),
                status: formData.status,
            });
        } catch (error) {
            console.error("Error submitting form:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof UserFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };

    const handleStatusToggle = (checked: boolean) => {
        setFormData((prev) => ({
            ...prev,
            status: checked ? "ACTIVE" : "INACTIVE",
        }));
    };

    const _selectedRole = USER_ROLES.find((role) => role.value === formData.role);

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Profile Image Section */}
            <Card className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center space-x-6">
                    <div className="relative">
                        <Avatar className="h-24 w-24 border-4 border-gray-200 dark:border-gray-700">
                            {imagePreview ? (
                                <Image
                                    src={imagePreview}
                                    alt="Profile preview"
                                    width={96}
                                    height={96}
                                    className="h-full w-full object-cover rounded-full"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full">
                                    <User className="h-10 w-10 text-gray-400" />
                                </div>
                            )}
                        </Avatar>
                        {imagePreview && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-red-500 hover:bg-red-600 text-white border-red-500"
                                onClick={removeImage}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            Profile Picture
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Upload a clear photo for the user profile. Recommended size: 400x400px.
                        </p>
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading}
                                className="flex items-center gap-2"
                            >
                                <Camera className="h-4 w-4" />
                                {imagePreview ? "Change Photo" : "Upload Photo"}
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </div>
                        {errors.image && (
                            <p className="text-sm text-red-500 mt-2">{errors.image}</p>
                        )}
                    </div>
                </div>
            </Card>

            {/* Basic Information */}
            <Card className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-0">
                    Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label
                            htmlFor="name"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Full Name *
                        </Label>
                        <Input
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            placeholder="Enter full name"
                            className={`${
                                errors.name
                                    ? "border-red-500 focus:ring-red-500"
                                    : "border-gray-300 dark:border-gray-600"
                            } bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
                            disabled={isLoading}
                        />
                        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                    </div>

                    {/* Profile ID */}
                    <div className="space-y-2">
                        <Label
                            htmlFor="profileId"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Profile ID *
                        </Label>
                        <Input
                            id="profileId"
                            type="text"
                            value={formData.profileId}
                            onChange={(e) => handleInputChange("profileId", e.target.value)}
                            placeholder="e.g., STU2024001, FAC2024001"
                            className={`${
                                errors.profileId
                                    ? "border-red-500 focus:ring-red-500"
                                    : "border-gray-300 dark:border-gray-600"
                            } bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
                            disabled={isLoading}
                        />
                        {errors.profileId && (
                            <p className="text-sm text-red-500">{errors.profileId}</p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Unique identifier like student ID or employee ID
                        </p>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <Label
                            htmlFor="email"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Email Address *
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange("email", e.target.value)}
                            placeholder="Enter email address"
                            className={`${
                                errors.email
                                    ? "border-red-500 focus:ring-red-500"
                                    : "border-gray-300 dark:border-gray-600"
                            } bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
                            disabled={isLoading}
                        />
                        {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                        <Label
                            htmlFor="phoneNumber"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Phone Number *
                        </Label>
                        <Input
                            id="phoneNumber"
                            type="tel"
                            value={formData.phoneNumber}
                            onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                            placeholder="Enter phone number"
                            className={`${
                                errors.phoneNumber
                                    ? "border-red-500 focus:ring-red-500"
                                    : "border-gray-300 dark:border-gray-600"
                            } bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
                            disabled={isLoading}
                        />
                        {errors.phoneNumber && (
                            <p className="text-sm text-red-500">{errors.phoneNumber}</p>
                        )}
                    </div>
                </div>
            </Card>

            {/* Role & Status */}
            <Card className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-0">
                    Role & Status
                </h3>
                <div className="space-y-6">
                    {/* Role Selection */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            User Role *
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {USER_ROLES.map((role) => (
                                <div
                                    key={role.value}
                                    className={`relative rounded-lg border-2 cursor-pointer transition-all ${
                                        formData.role === role.value
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                            : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                                    }`}
                                    onClick={() => handleInputChange("role", role.value)}
                                >
                                    <div className="p-4">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-4 h-4 rounded-full ${role.color}`} />
                                            <div className="flex-1">
                                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {role.label}
                                                </h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {role.description}
                                                </p>
                                            </div>
                                            <input
                                                type="radio"
                                                name="role"
                                                value={role.value}
                                                checked={formData.role === role.value}
                                                onChange={() =>
                                                    handleInputChange("role", role.value)
                                                }
                                                className="h-4 w-4 text-blue-600"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
                        <div className="space-y-1">
                            <Label
                                htmlFor="status"
                                className="text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Account Status
                            </Label>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formData.status === "ACTIVE"
                                    ? "User account is active and can access the system"
                                    : "User account is inactive and cannot access the system"}
                            </p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <span
                                className={`text-sm font-medium ${
                                    formData.status === "ACTIVE"
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-red-600 dark:text-red-400"
                                }`}
                            >
                                {formData.status}
                            </span>
                            <Switch
                                id="status"
                                checked={formData.status === "ACTIVE"}
                                onCheckedChange={handleStatusToggle}
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Form Actions */}
            <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={
                        isLoading ||
                        !formData.name.trim() ||
                        !formData.email.trim() ||
                        !formData.profileId.trim() ||
                        !formData.phoneNumber.trim()
                    }
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {isLoading ? "Saving..." : initialData ? "Update User" : "Create User"}
                </Button>
            </div>
        </form>
    );
}
