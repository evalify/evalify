"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter, Plus, Search, Users, UserCheck } from "lucide-react";
import { Modal } from "@/components/admin/shared/modal";
import { DataTable } from "@/components/admin/shared/data-table";
import { BatchForm } from "./batch-form";
import { BatchStudentsModal } from "./batch-students-modal";
import { useAnalytics } from "@/hooks/use-analytics";
import { useToast } from "@/hooks/use-toast";

interface Batch {
    id: number;
    createdAt: Date;
    name: string;
    joinYear: number;
    graduationYear: number;
    section: string;
    departmentId: number;
    isActive: "ACTIVE" | "INACTIVE";
    updatedAt: Date | null;
    departmentName?: string | null;
}

export function BatchManagement() {
    const [searchTerm, setSearchTerm] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState<number | "ALL">("ALL");
    const [yearFilter, setYearFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

    const { track } = useAnalytics();
    const { success, error } = useToast();
    const utils = trpc.useUtils();

    // Queries
    const { data: batchesData, isLoading: batchesLoading } = trpc.batch.list.useQuery({
        searchTerm: searchTerm || undefined,
    });

    const { data: departmentsData, isLoading: departmentsLoading } = trpc.department.list.useQuery(
        {}
    );

    const batches = useMemo(() => batchesData?.batches || [], [batchesData]);
    const departments = departmentsData?.departments || [];
    const isLoading = batchesLoading || departmentsLoading;

    // Mutations
    const createBatch = trpc.batch.create.useMutation({
        onSuccess: () => {
            utils.batch.list.invalidate();
            utils.department.list.invalidate();
            success("Batch created successfully");
        },
        onError: (err) => {
            error(err.message || "Failed to create batch");
        },
    });

    const updateBatch = trpc.batch.update.useMutation({
        onSuccess: () => {
            utils.batch.list.invalidate();
            utils.department.list.invalidate();
            success("Batch updated successfully");
        },
        onError: (err) => {
            error(err.message || "Failed to update batch");
        },
    });

    const deleteBatch = trpc.batch.delete.useMutation({
        onSuccess: () => {
            utils.batch.list.invalidate();
            utils.department.list.invalidate();
            success("Batch deleted successfully");
        },
        onError: (err) => {
            error(err.message || "Failed to delete batch");
        },
    });

    // Filter batches based on search, department, year, and status
    const filteredBatches = useMemo(() => {
        let filtered = batches;

        if (searchTerm) {
            filtered = filtered.filter(
                (batch) =>
                    batch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    batch.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    batch.joinYear.toString().includes(searchTerm) ||
                    batch.graduationYear.toString().includes(searchTerm)
            );
        }

        if (departmentFilter !== "ALL") {
            filtered = filtered.filter((batch) => batch.departmentId === Number(departmentFilter));
        }

        if (yearFilter !== "ALL") {
            const filterYear = parseInt(yearFilter);
            filtered = filtered.filter(
                (batch) => batch.joinYear === filterYear || batch.graduationYear === filterYear
            );
        }

        if (statusFilter !== "ALL") {
            filtered = filtered.filter((batch) => batch.isActive === statusFilter);
        }

        return filtered;
    }, [batches, searchTerm, departmentFilter, yearFilter, statusFilter]);

    // Get unique years for filtering (both join and graduation years)
    const availableYears = useMemo(() => {
        const allYears = new Set<number>();
        batches.forEach((batch) => {
            allYears.add(batch.joinYear);
            allYears.add(batch.graduationYear);
        });
        return [...allYears].sort((a, b) => b - a);
    }, [batches]);

    const handleCreate = async (data: {
        joinYear: number;
        graduationYear: number;
        section: string;
        departmentId: number;
        isActive: "ACTIVE" | "INACTIVE";
    }) => {
        try {
            await createBatch.mutateAsync(data);
            setIsCreateModalOpen(false);
            track("batch_created", {
                joinYear: data.joinYear,
                graduationYear: data.graduationYear,
                section: data.section,
            });
        } catch (error) {
            console.error("Error creating batch:", error);
        }
    };

    const handleEdit = async (data: {
        joinYear: number;
        graduationYear: number;
        section: string;
        departmentId: number;
        isActive: "ACTIVE" | "INACTIVE";
    }) => {
        if (!selectedBatch) return;

        try {
            await updateBatch.mutateAsync({
                id: selectedBatch.id,
                ...data,
            });
            setIsEditModalOpen(false);
            setSelectedBatch(null);
            track("batch_updated", { id: selectedBatch.id });
        } catch (error) {
            console.error("Error updating batch:", error);
        }
    };

    const handleDelete = async (batch: Batch) => {
        if (
            confirm(
                `Are you sure you want to delete "${batch.name} - ${batch.section} (${batch.graduationYear})"?`
            )
        ) {
            try {
                await deleteBatch.mutateAsync({ id: batch.id });
                track("batch_deleted", { id: batch.id });
            } catch (error) {
                console.error("Error deleting batch:", error);
            }
        }
    };

    const openEditModal = (batch: Batch) => {
        setSelectedBatch(batch);
        setIsEditModalOpen(true);
    };

    const openStudentsModal = (batch: Batch) => {
        setSelectedBatch(batch);
        setIsStudentsModalOpen(true);
    };

    const resetFilters = () => {
        setSearchTerm("");
        setDepartmentFilter("ALL");
        setYearFilter("ALL");
        setStatusFilter("ALL");
        track("Batch Filters Reset");
    };

    // Table columns
    const tableColumns = [
        {
            key: "name" as keyof Batch,
            label: "Batch Name",
            sortable: true,
            render: (_value: unknown, batch: Batch) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                            {batch.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Section {batch.section} • Join: {batch.joinYear} • Grad:{" "}
                            {batch.graduationYear}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: "joinYear" as keyof Batch,
            label: "Join Year",
            sortable: true,
        },
        {
            key: "graduationYear" as keyof Batch,
            label: "Graduation Year",
            sortable: true,
        },
        {
            key: "section" as keyof Batch,
            label: "Section",
            sortable: true,
        },
        {
            key: "isActive" as keyof Batch,
            label: "Status",
            render: (_value: unknown, batch: Batch) => (
                <Badge variant={batch.isActive === "ACTIVE" ? "default" : "destructive"}>
                    {batch.isActive}
                </Badge>
            ),
        },
        {
            key: "createdAt" as keyof Batch,
            label: "Created",
            render: (_value: unknown, batch: Batch) => (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(batch.createdAt).toLocaleDateString()}
                </div>
            ),
        },
        {
            key: "actions" as keyof Batch,
            label: "Actions",
            render: (_value: unknown, batch: Batch) => (
                <Button
                    onClick={() => openStudentsModal(batch)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                >
                    <UserCheck className="h-3 w-3" />
                    Manage Students
                </Button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Batch Management</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage student batches and their graduation years
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setIsCreateModalOpen(true);
                        track("Batch Create Initiated");
                    }}
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Batch
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                    </CardTitle>
                    <CardDescription>Filter batches by name, section, or status</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                    placeholder="Search batches..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Department</label>
                            <select
                                value={departmentFilter}
                                onChange={(e) =>
                                    setDepartmentFilter(
                                        e.target.value === "ALL" ? "ALL" : Number(e.target.value)
                                    )
                                }
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="ALL">All Departments</option>
                                {departments.map((dept) => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Year (Join/Graduation)</label>
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

            {/* Batches Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Batches</CardTitle>
                            <CardDescription>
                                {filteredBatches.length} of {batches.length} batches
                                {searchTerm && ` matching "${searchTerm}"`}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable
                        data={filteredBatches}
                        columns={tableColumns}
                        loading={isLoading}
                        onEdit={(batch) => {
                            openEditModal(batch);
                            track("Batch Edit Modal Opened", { batchId: batch.id });
                        }}
                        onDelete={(batch) => handleDelete(batch)}
                    />
                </CardContent>
            </Card>

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create Batch"
            >
                <BatchForm
                    departments={departments}
                    onSubmit={handleCreate}
                    onCancel={() => setIsCreateModalOpen(false)}
                />
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedBatch(null);
                }}
                title="Edit Batch"
            >
                <BatchForm
                    departments={departments}
                    initialData={selectedBatch}
                    onSubmit={handleEdit}
                    onCancel={() => {
                        setIsEditModalOpen(false);
                        setSelectedBatch(null);
                    }}
                />
            </Modal>

            {/* Students Modal */}
            <Modal
                isOpen={isStudentsModalOpen}
                onClose={() => {
                    setIsStudentsModalOpen(false);
                    setSelectedBatch(null);
                }}
                title={`Manage Students - ${selectedBatch?.name}`}
                size="xl"
            >
                {selectedBatch && (
                    <BatchStudentsModal
                        batchId={selectedBatch.id}
                        batchName={selectedBatch.name}
                        onClose={() => {
                            setIsStudentsModalOpen(false);
                            setSelectedBatch(null);
                        }}
                    />
                )}
            </Modal>
        </div>
    );
}
