"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Calendar, Filter, Plus, Search, BookOpen } from "lucide-react";
import { Modal } from "@/components/admin/shared/modal";
import { DataTable } from "@/components/admin/shared/data-table";
import { SemesterForm } from "./semester-form";
import { useAnalytics } from "@/hooks/use-analytics";
import { useRouter } from "next/navigation";

interface Semester {
    id: number;
    name: string;
    year: number;
    departmentId: number;
    isActive: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date | null;
    departmentName?: string | null;
}

export function SemesterManagement() {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
    const [yearFilter, setYearFilter] = useState<string>("ALL");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);

    const { track } = useAnalytics();
    const { success, error } = useToast();
    const router = useRouter();

    const handleViewCourses = (semester: Semester) => {
        router.push(`/admin/semester/${semester.id}/courses`);
        track("semester_courses_viewed", { semesterId: semester.id });
    };

    // Queries
    const semestersData = trpc.semester.list.useQuery({
        searchTerm: searchTerm || undefined,
    });

    const semesters = semestersData?.data?.semesters || [];

    // Mutations
    const utils = trpc.useUtils();
    const createSemester = trpc.semester.create.useMutation({
        onSuccess: () => {
            utils.semester.list.invalidate();
            success("Semester created successfully");
        },
        onError: (err) => {
            console.error("Create semester error:", err);

            // Parse error message for better user feedback
            let errorMessage = "Failed to create semester";

            if (err.message.includes("department_id")) {
                errorMessage = "Invalid department selected. Please choose a valid department.";
            } else if (err.message.includes("duplicate") || err.message.includes("unique")) {
                errorMessage =
                    "A semester with this name already exists for the selected year and department.";
            } else if (err.message.includes("foreign key")) {
                errorMessage = "The selected department does not exist.";
            } else if (err.message) {
                errorMessage = err.message;
            }

            error(errorMessage);
        },
    });
    const updateSemester = trpc.semester.update.useMutation({
        onSuccess: () => {
            utils.semester.list.invalidate();
            success("Semester updated successfully");
        },
        onError: (err) => {
            console.error("Update semester error:", err);

            // Parse error message for better user feedback
            let errorMessage = "Failed to update semester";

            if (err.message.includes("department_id")) {
                errorMessage = "Invalid department selected. Please choose a valid department.";
            } else if (err.message.includes("duplicate") || err.message.includes("unique")) {
                errorMessage =
                    "A semester with this name already exists for the selected year and department.";
            } else if (err.message.includes("foreign key")) {
                errorMessage = "The selected department does not exist.";
            } else if (err.message.includes("not found")) {
                errorMessage = "Semester not found. It may have been deleted.";
            } else if (err.message) {
                errorMessage = err.message;
            }

            error(errorMessage);
        },
    });
    const deleteSemester = trpc.semester.delete.useMutation({
        onSuccess: () => {
            utils.semester.list.invalidate();
            success("Semester deleted successfully");
        },
        onError: (err) => {
            console.error("Delete semester error:", err);

            // Parse error message for better user feedback
            let errorMessage = "Failed to delete semester";

            if (err.message.includes("foreign key") || err.message.includes("constraint")) {
                errorMessage =
                    "Cannot delete semester. It is associated with courses or other data. Please remove those first.";
            } else if (err.message.includes("not found")) {
                errorMessage = "Semester not found. It may have already been deleted.";
            } else if (err.message) {
                errorMessage = err.message;
            }

            error(errorMessage);
        },
    });

    // Filter semesters based on search, status, and year
    const filteredSemesters = useMemo(() => {
        let filtered = semesters;

        if (searchTerm) {
            filtered = filtered.filter(
                (semester) =>
                    semester.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    semester.year.toString().includes(searchTerm)
            );
        }

        if (statusFilter !== "ALL") {
            filtered = filtered.filter((semester) => semester.isActive === statusFilter);
        }

        if (yearFilter !== "ALL") {
            filtered = filtered.filter((semester) => semester.year.toString() === yearFilter);
        }

        return filtered;
    }, [semesters, searchTerm, statusFilter, yearFilter]);

    // Get unique years for filtering
    const availableYears = useMemo(() => {
        const years = [...new Set(semesters.map((s) => s.year))].sort((a, b) => b - a);
        return years;
    }, [semesters]);

    const handleCreate = async (data: {
        name: string;
        year: number;
        departmentId: number;
        isActive: "ACTIVE" | "INACTIVE";
    }) => {
        try {
            await createSemester.mutateAsync(data);
            setIsCreateModalOpen(false);
            track("semester_created", { name: data.name, year: data.year });
        } catch (error) {
            console.error("Error creating semester:", error);
        }
    };

    const handleEdit = async (data: {
        name: string;
        year: number;
        departmentId: number;
        isActive: "ACTIVE" | "INACTIVE";
    }) => {
        if (!selectedSemester) return;

        try {
            await updateSemester.mutateAsync({
                id: selectedSemester.id,
                ...data,
            });
            setIsEditModalOpen(false);
            setSelectedSemester(null);
            track("semester_updated", { id: selectedSemester.id });
        } catch (error) {
            console.error("Error updating semester:", error);
        }
    };

    const handleDelete = async (semester: Semester) => {
        if (confirm(`Are you sure you want to delete "${semester.name} (${semester.year})"?`)) {
            try {
                await deleteSemester.mutateAsync({ id: semester.id });
                track("semester_deleted", { id: semester.id });
            } catch (error) {
                console.error("Error deleting semester:", error);
            }
        }
    };

    const openEditModal = (semester: Semester) => {
        setSelectedSemester(semester);
        setIsEditModalOpen(true);
    };

    const resetFilters = () => {
        setSearchTerm("");
        setStatusFilter("ALL");
        setYearFilter("ALL");
        track("Semester Filters Reset");
    };

    // Table columns
    const tableColumns = [
        {
            key: "name" as keyof Semester,
            label: "Semester Name",
            sortable: true,
            render: (_value: unknown, semester: Semester) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                            {semester.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Year {semester.year}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: "year" as keyof Semester,
            label: "Year",
            sortable: true,
        },
        {
            key: "isActive" as keyof Semester,
            label: "Status",
            render: (_value: unknown, semester: Semester) => (
                <Badge variant={semester.isActive === "ACTIVE" ? "default" : "destructive"}>
                    {semester.isActive}
                </Badge>
            ),
        },
        {
            key: "createdAt" as keyof Semester,
            label: "Created",
            render: (_value: unknown, semester: Semester) => (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(semester.createdAt).toLocaleDateString()}
                </div>
            ),
        },
        {
            key: "actions" as keyof Semester,
            label: "Actions",
            render: (_value: unknown, semester: Semester) => (
                <Button
                    onClick={() => handleViewCourses(semester)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                >
                    <BookOpen className="h-4 w-4" />
                    View Courses
                </Button>
            ),
        },
    ];

    return (
        <div className="space-y-3">
            {/* Header Card */}
            <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="px-0 pb-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
                                Semesters
                            </h2>
                            <p className="text-muted-foreground">Manage academic semesters</p>
                        </div>
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-black hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Semester
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            {/* Filters Card */}
            <Card className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">Filters</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Filter semesters by name, year, or status
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search semesters..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Year</label>
                            <select
                                value={yearFilter}
                                onChange={(e) => setYearFilter(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="ALL">All Years</option>
                                {availableYears.map((year) => (
                                    <option key={year} value={year.toString()}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")
                                }
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="ALL">All Status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>

                        <div className="flex items-end">
                            <Button variant="outline" onClick={resetFilters} className="w-full">
                                Reset Filters
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Data Table Card */}
            <Card className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Semesters</h3>
                            <p className="text-sm text-muted-foreground">
                                {filteredSemesters.length} of {semesters.length} semesters
                                {searchTerm && ` matching "${searchTerm}"`}
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable
                        data={filteredSemesters}
                        columns={tableColumns}
                        onEdit={openEditModal}
                        onDelete={handleDelete}
                        loading={semestersData.isLoading}
                    />
                </CardContent>
            </Card>

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create Semester"
            >
                <SemesterForm
                    onSubmit={handleCreate}
                    onCancel={() => setIsCreateModalOpen(false)}
                />
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedSemester(null);
                }}
                title="Edit Semester"
            >
                <SemesterForm
                    initialData={selectedSemester}
                    onSubmit={handleEdit}
                    onCancel={() => {
                        setIsEditModalOpen(false);
                        setSelectedSemester(null);
                    }}
                />
            </Modal>
        </div>
    );
}
