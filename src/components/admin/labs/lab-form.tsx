"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Alert, AlertDescription } from "../../ui/alert";
import { Badge } from "../../ui/badge";
import { Building2, Network, MapPin, AlertCircle } from "lucide-react";
import { useAnalytics } from "../../../hooks/use-analytics";
import { useToast } from "@/hooks/use-toast";

interface LabFormProps {
    labId?: string;
    onSuccess: () => void;
    onCancel: () => void;
}

export function LabForm({ labId, onSuccess, onCancel }: LabFormProps) {
    const { track } = useAnalytics();
    const { success, error } = useToast();
    const [formData, setFormData] = useState({
        name: "",
        block: "",
        ipSubnet: "",
        isActive: "ACTIVE" as "ACTIVE" | "INACTIVE",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const utils = trpc.useUtils();

    // Queries
    const { data: lab } = trpc.lab.get.useQuery({ id: labId! }, { enabled: !!labId });
    const { data: blocks } = trpc.lab.getUniqueBlocks.useQuery();

    // Mutations
    const createLab = trpc.lab.create.useMutation({
        onSuccess: () => {
            utils.lab.list.invalidate();
            success("Lab created successfully");
            onSuccess();
        },
        onError: (err) => {
            error(err.message || "Failed to create lab");
        },
    });

    const updateLab = trpc.lab.update.useMutation({
        onSuccess: () => {
            utils.lab.list.invalidate();
            utils.lab.get.invalidate({ id: labId! });
            success("Lab updated successfully");
            onSuccess();
        },
        onError: (err) => {
            error(err.message || "Failed to update lab");
        },
    });

    const isEditing = Boolean(labId);

    // Load lab data for editing
    useEffect(() => {
        if (lab) {
            setFormData({
                name: lab.name,
                block: lab.block,
                ipSubnet: lab.ipSubnet,
                isActive: lab.isActive,
            });
        }
    }, [lab]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = "Lab name is required";
        } else if (formData.name.length > 100) {
            newErrors.name = "Lab name must be less than 100 characters";
        }

        if (!formData.block.trim()) {
            newErrors.block = "Block is required";
        } else if (formData.block.length > 50) {
            newErrors.block = "Block must be less than 50 characters";
        }

        if (!formData.ipSubnet.trim()) {
            newErrors.ipSubnet = "IP Subnet is required";
        } else {
            // Basic CIDR validation
            const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
            if (!cidrRegex.test(formData.ipSubnet)) {
                newErrors.ipSubnet =
                    "Invalid IP Subnet format. Use CIDR notation (e.g., 192.168.1.0/24)";
            }
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
        setErrors({});

        try {
            const submitData = {
                name: formData.name.trim(),
                block: formData.block.trim(),
                ipSubnet: formData.ipSubnet.trim(),
                isActive: formData.isActive,
            };

            if (isEditing && labId) {
                await updateLab.mutateAsync({
                    id: labId,
                    ...submitData,
                });
                track("Lab Updated", {
                    labId,
                    block: submitData.block,
                });
            } else {
                const result = await createLab.mutateAsync(submitData);
                track("Lab Created", {
                    labId: result.id,
                    block: submitData.block,
                });
            }
        } catch (error) {
            console.error("Error saving lab:", error);
            setErrors({
                submit: error instanceof Error ? error.message : "Failed to save lab",
            });
            track("Lab Save Error", {
                error: error instanceof Error ? error.message : "Unknown error",
                isEditing,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };

    if (isEditing && !lab) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {errors.submit && (
                <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-600">{errors.submit}</AlertDescription>
                </Alert>
            )}

            <div className="flex gap-4 flex-col">
                {/* Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Basic Information
                        </CardTitle>
                        <CardDescription>Enter the lab name and location details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Lab Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleInputChange("name", e.target.value)}
                                placeholder="Enter lab name"
                                className={errors.name ? "border-red-300" : ""}
                            />
                            {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="block">Block *</Label>
                            <Input
                                id="block"
                                value={formData.block}
                                onChange={(e) => handleInputChange("block", e.target.value)}
                                placeholder="Enter block (e.g., A, B, Main Building)"
                                className={errors.block ? "border-red-300" : ""}
                                list="blocks-list"
                            />
                            {blocks && blocks.length > 0 && (
                                <datalist id="blocks-list">
                                    {blocks.map((block) => (
                                        <option key={block} value={block} />
                                    ))}
                                </datalist>
                            )}
                            {errors.block && <p className="text-sm text-red-600">{errors.block}</p>}
                        </div>
                    </CardContent>
                </Card>

                {/* Network Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Network className="h-5 w-5" />
                            Network Configuration
                        </CardTitle>
                        <CardDescription>Configure the lab&apos;s network settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="ipSubnet">IP Subnet *</Label>
                            <Input
                                id="ipSubnet"
                                value={formData.ipSubnet}
                                onChange={(e) => handleInputChange("ipSubnet", e.target.value)}
                                placeholder="192.168.1.0/24"
                                className={errors.ipSubnet ? "border-red-300" : ""}
                            />
                            <p className="text-xs text-gray-500">
                                Use CIDR notation (e.g., 192.168.1.0/24)
                            </p>
                            {errors.ipSubnet && (
                                <p className="text-sm text-red-600">{errors.ipSubnet}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Status */}
            {isEditing && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Status
                        </CardTitle>
                        <CardDescription>Control the lab availability</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => handleInputChange("isActive", "ACTIVE")}
                                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                                    formData.isActive === "ACTIVE"
                                        ? "border-green-500 bg-green-50"
                                        : "border-gray-200 hover:border-gray-300"
                                }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Badge
                                        variant={
                                            formData.isActive === "ACTIVE" ? "default" : "outline"
                                        }
                                    >
                                        Active
                                    </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">Lab is available</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleInputChange("isActive", "INACTIVE")}
                                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                                    formData.isActive === "INACTIVE"
                                        ? "border-red-500 bg-red-50"
                                        : "border-gray-200 hover:border-gray-300"
                                }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Badge
                                        variant={
                                            formData.isActive === "INACTIVE"
                                                ? "destructive"
                                                : "outline"
                                        }
                                    >
                                        Inactive
                                    </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">Lab is disabled</p>
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            {isEditing ? "Updating..." : "Creating..."}
                        </div>
                    ) : isEditing ? (
                        "Update Lab"
                    ) : (
                        "Create Lab"
                    )}
                </Button>
            </div>
        </form>
    );
}
