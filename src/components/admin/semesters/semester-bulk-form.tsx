"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SemesterBulkFormData {
    departmentIds: string[];
    batchStartYear: number;
    batchEndYear: number;
    semesterType: "ODD" | "EVEN";
}

interface SemesterBulkFormProps {
    onSubmit: (
        semesters: Array<{
            name: string;
            year: number;
            departmentId: string;
            isActive: "ACTIVE" | "INACTIVE";
        }>
    ) => Promise<void>;
    onCancel: () => void;
}

// Helper to generate all semesters from start year to end year
const generateSemesters = (
    batchStartYear: number,
    batchEndYear: number,
    semesterType: "ODD" | "EVEN",
    departmentCode: string
) => {
    const semesters: Array<{ name: string; year: number; semesterNumber: number }> = [];

    // Calculate total years in the range
    const yearGap = batchEndYear - batchStartYear;

    // Generate semesters based on type
    // Starting semester number: 1 for ODD, 2 for EVEN
    const startingSemNum = semesterType === "ODD" ? 1 : 2;

    // Loop through each year offset and calculate the semester
    for (let yearOffset = 0; yearOffset <= yearGap; yearOffset++) {
        const semesterNumber = startingSemNum + yearOffset * 2;
        const semesterYear = batchEndYear - yearOffset;

        // Only add semesters up to S8 (or S10 max if needed)
        if (
            semesterNumber <= 10 &&
            semesterYear >= batchStartYear &&
            semesterYear <= batchEndYear
        ) {
            semesters.push({
                name: `S${semesterNumber}-${departmentCode}-${semesterYear.toString().slice(-2)}`,
                year: semesterYear,
                semesterNumber: semesterNumber,
            });
        }
    }

    return semesters;
};

export function SemesterBulkForm({ onSubmit, onCancel }: SemesterBulkFormProps) {
    const [formData, setFormData] = useState<SemesterBulkFormData>({
        departmentIds: [],
        batchStartYear: new Date().getFullYear() - 3, // Default to 3 years ago
        batchEndYear: new Date().getFullYear(),
        semesterType: "ODD",
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [departmentSearchTerm, setDepartmentSearchTerm] = useState("");

    // Fetch departments for selection
    const { data: departmentsData, isLoading: isDepartmentsLoading } =
        trpc.department.list.useQuery({});

    // Memoize departments to prevent unnecessary re-renders
    const departments = useMemo(
        () => departmentsData?.departments || [],
        [departmentsData?.departments]
    );

    // Filter departments based on search term
    const filteredDepartments = useMemo(() => {
        if (!departmentSearchTerm.trim()) return departments;

        const searchLower = departmentSearchTerm.toLowerCase();
        return departments.filter(
            (dept) =>
                dept.name.toLowerCase().includes(searchLower) ||
                dept.name.substring(0, 3).toUpperCase().includes(searchLower.toUpperCase())
        );
    }, [departments, departmentSearchTerm]);

    // Generate preview of semesters to be created
    const previewSemesters = useMemo(() => {
        if (formData.departmentIds.length === 0) return [];

        const allSemesters: Array<{
            name: string;
            year: number;
            departmentId: string;
            departmentName: string;
            departmentCode: string;
            semesterNumber: number;
        }> = [];

        formData.departmentIds.forEach((deptId) => {
            const dept = departments.find((d) => d.id === deptId);
            if (!dept) return;

            const deptCode = dept.name.substring(0, 3).toUpperCase();
            const semesters = generateSemesters(
                formData.batchStartYear,
                formData.batchEndYear,
                formData.semesterType,
                deptCode
            );

            semesters.forEach((sem) => {
                allSemesters.push({
                    name: sem.name,
                    year: sem.year,
                    departmentId: deptId,
                    departmentName: dept.name,
                    departmentCode: deptCode,
                    semesterNumber: sem.semesterNumber,
                });
            });
        });

        return allSemesters;
    }, [
        formData.departmentIds,
        formData.batchStartYear,
        formData.batchEndYear,
        formData.semesterType,
        departments,
    ]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        const currentYearNow = new Date().getFullYear();

        if (formData.departmentIds.length === 0) {
            newErrors.departments = "Please select at least one department";
        }

        if (formData.batchStartYear < currentYearNow - 10) {
            newErrors.batchStartYear = "Batch start year cannot be more than 10 years in the past";
        } else if (formData.batchStartYear > currentYearNow) {
            newErrors.batchStartYear = "Batch start year cannot be in the future";
        }

        if (formData.batchEndYear < formData.batchStartYear) {
            newErrors.batchEndYear = "Batch end year cannot be before batch start year";
        } else if (formData.batchEndYear > currentYearNow + 1) {
            newErrors.batchEndYear = "Batch end year cannot be more than 1 year in the future";
        }

        // Validate maximum 5 year gap
        const yearGap = formData.batchEndYear - formData.batchStartYear;
        if (yearGap > 5) {
            newErrors.batchEndYear = "Maximum gap between batch start year and end year is 5 years";
        }

        if (previewSemesters.length === 0) {
            newErrors.preview = "No semesters will be created with current settings";
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
            const semestersToCreate = previewSemesters.map((sem) => ({
                name: sem.name,
                year: sem.year,
                departmentId: sem.departmentId,
                isActive: "ACTIVE" as const,
            }));

            await onSubmit(semestersToCreate);
        } catch (error) {
            console.error("Error submitting bulk form:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDepartmentToggle = (departmentId: string, checked: boolean) => {
        setFormData((prev) => {
            const newDepartmentIds = checked
                ? [...prev.departmentIds, departmentId]
                : prev.departmentIds.filter((id) => id !== departmentId);

            return { ...prev, departmentIds: newDepartmentIds };
        });

        // Clear department error when user selects
        if (errors.departments && checked) {
            setErrors((prev) => ({ ...prev, departments: "" }));
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const activeDepartmentIds = filteredDepartments
                .filter((dept) => dept.isActive === "ACTIVE")
                .map((dept) => dept.id);
            setFormData((prev) => ({ ...prev, departmentIds: activeDepartmentIds }));
        } else {
            setFormData((prev) => ({ ...prev, departmentIds: [] }));
        }
    };

    const handleSemesterTypeChange = (value: string) => {
        setFormData((prev) => ({
            ...prev,
            semesterType: value as "ODD" | "EVEN",
        }));
    };

    const activeDepartments = filteredDepartments.filter((dept) => dept.isActive === "ACTIVE");
    const allSelected =
        activeDepartments.length > 0 && formData.departmentIds.length === activeDepartments.length;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                {/* Department Selection with Search */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                            Select Departments <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="select-all"
                                checked={allSelected}
                                onCheckedChange={handleSelectAll}
                                disabled={isLoading || isDepartmentsLoading}
                                className="data-[state=indeterminate]:bg-primary"
                            />
                            <label
                                htmlFor="select-all"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Select All
                            </label>
                        </div>
                    </div>

                    {/* Search Bar for Departments */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search departments..."
                            value={departmentSearchTerm}
                            onChange={(e) => setDepartmentSearchTerm(e.target.value)}
                            className="pl-10"
                            disabled={isLoading || isDepartmentsLoading}
                        />
                    </div>

                    {/* Scrollable Department List */}
                    <div className="h-[200px] w-full rounded-md border overflow-hidden">
                        <ScrollArea className="h-full w-full">
                            <div className="p-4 space-y-3">
                                {isDepartmentsLoading ? (
                                    <p className="text-sm text-muted-foreground">
                                        Loading departments...
                                    </p>
                                ) : filteredDepartments.filter((d) => d.isActive === "ACTIVE")
                                      .length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {departmentSearchTerm
                                            ? "No departments found matching your search"
                                            : "No active departments available"}
                                    </p>
                                ) : (
                                    filteredDepartments
                                        .filter((d) => d.isActive === "ACTIVE")
                                        .map((department) => (
                                            <div
                                                key={department.id}
                                                className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                                            >
                                                <Checkbox
                                                    id={`dept-${department.id}`}
                                                    checked={formData.departmentIds.includes(
                                                        department.id
                                                    )}
                                                    onCheckedChange={(checked) =>
                                                        handleDepartmentToggle(
                                                            department.id,
                                                            checked as boolean
                                                        )
                                                    }
                                                    disabled={isLoading}
                                                />
                                                <label
                                                    htmlFor={`dept-${department.id}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                                >
                                                    {department.name} (
                                                    {department.name.substring(0, 3).toUpperCase()})
                                                </label>
                                            </div>
                                        ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {errors.departments && (
                        <p className="text-sm text-red-500">{errors.departments}</p>
                    )}

                    {formData.departmentIds.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                            {formData.departmentIds.length} department
                            {formData.departmentIds.length !== 1 ? "s" : ""} selected
                        </p>
                    )}
                </div>

                {/* Batch Start Year */}
                <div className="space-y-2">
                    <Label htmlFor="batchStartYear" className="text-sm font-medium">
                        Batch Start Year <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="batchStartYear"
                        type="number"
                        value={formData.batchStartYear}
                        onChange={(e) => {
                            const year = parseInt(e.target.value) || new Date().getFullYear();
                            setFormData((prev) => ({ ...prev, batchStartYear: year }));
                            if (errors.batchStartYear) {
                                setErrors((prev) => ({ ...prev, batchStartYear: "" }));
                            }
                        }}
                        min={new Date().getFullYear() - 10}
                        max={new Date().getFullYear()}
                        className={errors.batchStartYear ? "border-red-500" : ""}
                        disabled={isLoading}
                        placeholder="Enter batch start year (e.g., 2023)"
                    />
                    {errors.batchStartYear && (
                        <p className="text-sm text-red-500">{errors.batchStartYear}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        The year when the batch started their first semester
                    </p>
                </div>

                {/* Current Year */}
                <div className="space-y-2">
                    <Label htmlFor="batchEndYear" className="text-sm font-medium">
                        Batch End Year <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="batchEndYear"
                        type="number"
                        value={formData.batchEndYear}
                        onChange={(e) => {
                            const year = parseInt(e.target.value) || new Date().getFullYear();
                            setFormData((prev) => ({ ...prev, batchEndYear: year }));
                            if (errors.batchEndYear) {
                                setErrors((prev) => ({ ...prev, batchEndYear: "" }));
                            }
                        }}
                        min={formData.batchStartYear}
                        max={formData.batchStartYear + 5}
                        className={errors.batchEndYear ? "border-red-500" : ""}
                        disabled={isLoading}
                        placeholder="Enter batch end year (e.g., 2025)"
                    />
                    {errors.batchEndYear && (
                        <p className="text-sm text-red-500">{errors.batchEndYear}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Maximum 5 year gap from batch start year
                    </p>
                </div>

                {errors.calculation && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{errors.calculation}</AlertDescription>
                    </Alert>
                )}

                {/* Semester Type */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium">
                        Semester Type <span className="text-red-500">*</span>
                    </Label>
                    <RadioGroup
                        value={formData.semesterType}
                        onValueChange={handleSemesterTypeChange}
                        disabled={isLoading}
                        className="flex gap-4"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="ODD" id="odd" />
                            <Label htmlFor="odd" className="font-normal cursor-pointer">
                                Odd Semester
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="EVEN" id="even" />
                            <Label htmlFor="even" className="font-normal cursor-pointer">
                                Even Semester
                            </Label>
                        </div>
                    </RadioGroup>
                </div>

                {/* Preview Section */}
                {previewSemesters.length > 0 && (
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">
                            Preview ({previewSemesters.length} semester
                            {previewSemesters.length !== 1 ? "s" : ""} will be created)
                        </Label>
                        <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                            <div className="space-y-2">
                                {previewSemesters.map((sem) => (
                                    <div
                                        key={`${sem.departmentId}-${sem.name}`}
                                        className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            <span className="text-sm font-semibold">
                                                {sem.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                                {sem.departmentName}
                                            </Badge>
                                            <Badge variant="secondary" className="text-xs">
                                                Year: {sem.year}
                                            </Badge>
                                            <Badge variant="default" className="text-xs">
                                                S{sem.semesterNumber}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}

                {errors.preview && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{errors.preview}</AlertDescription>
                    </Alert>
                )}

                {previewSemesters.length === 0 && formData.departmentIds.length > 0 && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Select departments and configure settings to see preview
                        </AlertDescription>
                    </Alert>
                )}
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
                        formData.departmentIds.length === 0 ||
                        previewSemesters.length === 0
                    }
                    className="flex-1"
                >
                    {isLoading
                        ? "Creating..."
                        : `Create ${previewSemesters.length} Semester${previewSemesters.length !== 1 ? "s" : ""}`}
                </Button>
            </div>
        </form>
    );
}
