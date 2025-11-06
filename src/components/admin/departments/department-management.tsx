"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Filter, Plus, Search } from "lucide-react";
import { Modal } from "@/components/admin/shared/modal";
import { DataTable } from "@/components/admin/shared/data-table";
import { DepartmentForm } from "./department-form";
import { useAnalytics } from "@/hooks/use-analytics";
import { useToast } from "@/hooks/use-toast";

interface Department {
    id: number;
    name: string;
    isActive: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date | null;
}

export function DepartmentManagement() {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

    const { track } = useAnalytics();
    const { success, error } = useToast();
    const utils = trpc.useUtils();

    // Queries
    const { data: departmentsData, isLoading } = trpc.department.list.useQuery({
        searchTerm: searchTerm || undefined,
        isActive: statusFilter === "ALL" ? undefined : statusFilter,
    });

    const departments = useMemo(() => departmentsData?.departments || [], [departmentsData]);

    // Mutations
    const createDepartment = trpc.department.create.useMutation({
        onSuccess: () => {
            utils.department.list.invalidate();
            success("Department created successfully");
        },
        onError: (err) => {
            error(err.message || "Failed to create department");
        },
    });

    const updateDepartment = trpc.department.update.useMutation({
        onSuccess: () => {
            utils.department.list.invalidate();
            success("Department updated successfully");
        },
        onError: (err) => {
            error(err.message || "Failed to update department");
        },
    });

    const deleteDepartment = trpc.department.delete.useMutation({
        onSuccess: () => {
            utils.department.list.invalidate();
            success("Department deleted successfully");
        },
        onError: (err) => {
            error(err.message || "Failed to delete department");
        },
    });

    // Filter departments based on search and status
    const filteredDepartments = useMemo(() => {
        let filtered = departments;

        if (searchTerm) {
            filtered = filtered.filter((dept: Department) =>
                dept.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (statusFilter !== "ALL") {
            filtered = filtered.filter((dept: Department) => dept.isActive === statusFilter);
        }

        return filtered;
    }, [departments, searchTerm, statusFilter]);

    const handleCreate = async (data: { name: string; isActive: "ACTIVE" | "INACTIVE" }) => {
        try {
            await createDepartment.mutateAsync(data);
            setIsCreateModalOpen(false);
            track("department_created", { name: data.name });
        } catch (error) {
            console.error("Error creating department:", error);
        }
    };

    const handleEdit = async (data: { name: string; isActive: "ACTIVE" | "INACTIVE" }) => {
        if (!selectedDepartment) return;

        try {
            await updateDepartment.mutateAsync({
                id: selectedDepartment.id,
                ...data,
            });
            setIsEditModalOpen(false);
            setSelectedDepartment(null);
            track("department_updated", { id: selectedDepartment.id });
        } catch (error) {
            console.error("Error updating department:", error);
        }
    };

    const handleDelete = async (department: Department) => {
        if (confirm(`Are you sure you want to delete "${department.name}"?`)) {
            try {
                await deleteDepartment.mutateAsync({ id: department.id });
                track("department_deleted", { id: department.id });
            } catch (error) {
                console.error("Error deleting department:", error);
            }
        }
    };

    const openEditModal = (department: Department) => {
        setSelectedDepartment(department);
        setIsEditModalOpen(true);
    };

    const resetFilters = () => {
        setSearchTerm("");
        setStatusFilter("ALL");
        track("Department Filters Reset");
    };

    // Table columns
    const tableColumns = [
        {
            key: "name" as keyof Department,
            label: "Department Name",
            sortable: true,
            render: (_value: unknown, department: Department) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg dark:bg-blue-900">
                        <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                            {department.name}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: "isActive" as keyof Department,
            label: "Status",
            render: (_value: unknown, department: Department) => (
                <Badge variant={department.isActive === "ACTIVE" ? "default" : "destructive"}>
                    {department.isActive}
                </Badge>
            ),
        },
        {
            key: "createdAt" as keyof Department,
            label: "Created",
            render: (_value: unknown, department: Department) => (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(department.createdAt).toLocaleDateString()}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Department Management</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage university departments
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setIsCreateModalOpen(true);
                        track("Department Create Initiated");
                    }}
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Department
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                    </CardTitle>
                    <CardDescription>Filter departments by name or status</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                    placeholder="Search departments..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                    }}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(
                                        e.target.value as "ALL" | "ACTIVE" | "INACTIVE"
                                    );
                                }}
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

            {/* Departments Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Departments</CardTitle>
                            <CardDescription>
                                {filteredDepartments.length} of {departments.length} departments
                                {searchTerm && ` matching "${searchTerm}"`}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable
                        data={filteredDepartments}
                        columns={tableColumns}
                        loading={isLoading}
                        onEdit={(department) => {
                            openEditModal(department);
                            track("Department Edit Modal Opened", {
                                departmentId: department.id,
                            });
                        }}
                        onDelete={(department) => handleDelete(department)}
                    />
                </CardContent>
            </Card>

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create Department"
            >
                <DepartmentForm
                    onSubmit={handleCreate}
                    onCancel={() => setIsCreateModalOpen(false)}
                />
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedDepartment(null);
                }}
                title="Edit Department"
            >
                <DepartmentForm
                    initialData={selectedDepartment}
                    onSubmit={handleEdit}
                    onCancel={() => {
                        setIsEditModalOpen(false);
                        setSelectedDepartment(null);
                    }}
                />
            </Modal>
        </div>
    );
}
