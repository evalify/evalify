"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter, Plus, Search, Users, UserCheck } from "lucide-react";
import { DataTable } from "@/components/admin/shared/data-table";
import { BatchForm } from "./batch-form";
import { BatchStudentsModal } from "./batch-students-modal";
import { useAnalytics } from "@/hooks/use-analytics";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Batch {
    id: string;
    createdAt: Date;
    name: string;
    joinYear: number;
    graduationYear: number;
    section: string;
    departmentId: string;
    isActive: "ACTIVE" | "INACTIVE";
    updatedAt: Date | null;
    departmentName?: string | null;
}

export function BatchManagement() {
    const [searchTerm, setSearchTerm] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState<string | "ALL">("ALL");
    const [yearFilter, setYearFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");
    const [currentPage, setCurrentPage] = useState(1);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);

    const { track } = useAnalytics();
    const { success, error } = useToast();
    const utils = trpc.useUtils();

    const [limit, setLimit] = useState(5);

    // Queries
    const { data: batchesData, isLoading: batchesLoading } = trpc.batch.list.useQuery({
        searchTerm: searchTerm || undefined,
        departmentId: departmentFilter !== "ALL" ? departmentFilter : undefined,
        isActive: statusFilter !== "ALL" ? statusFilter : undefined,
        year: yearFilter !== "ALL" ? parseInt(yearFilter, 10) : undefined,
        limit,
        offset: (currentPage - 1) * limit,
    });

    const { data: departmentsData, isLoading: departmentsLoading } = trpc.department.list.useQuery(
        {}
    );

    const batches = useMemo(() => batchesData?.batches || [], [batchesData?.batches]);
    const departments = departmentsData?.departments || [];
    const isLoading = batchesLoading || departmentsLoading;
    const total = batchesData?.total || 0;
    const totalPages = Math.ceil(total / limit);

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
        name: string;
        joinYear: number;
        graduationYear: number;
        section: string;
        departmentId: string;
        isActive: "ACTIVE" | "INACTIVE";
    }) => {
        try {
            await createBatch.mutateAsync(data);
            setIsCreateModalOpen(false);
            track("batch_created", {
                name: data.name,
                joinYear: data.joinYear,
                graduationYear: data.graduationYear,
                section: data.section,
            });
        } catch (error) {
            console.error("Error creating batch:", error);
        }
    };

    const handleEdit = async (data: {
        name: string;
        joinYear: number;
        graduationYear: number;
        section: string;
        departmentId: string;
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
        setBatchToDelete(batch);
        setIsDeleteDialogOpen(true);
    };
    const confirmDelete = async () => {
        if (!batchToDelete) return;

        try {
            await deleteBatch.mutateAsync({ id: batchToDelete.id });
            track("batch_deleted", { id: batchToDelete.id });
        } catch (error) {
            console.error("Error deleting batch:", error);
        } finally {
            setIsDeleteDialogOpen(false);
            setBatchToDelete(null);
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
        setCurrentPage(1);
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
                                <input
                                    type="text"
                                    placeholder="Search batches..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Department</label>
                            <select
                                value={departmentFilter}
                                onChange={(e) => {
                                    setDepartmentFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
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
                                onChange={(e) => {
                                    setYearFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
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
                                onChange={(e) => {
                                    setStatusFilter(
                                        e.target.value as "ALL" | "ACTIVE" | "INACTIVE"
                                    );
                                    setCurrentPage(1);
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

            {/* Batches Table */}
            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle>Batches</CardTitle>
                        <CardDescription>
                            {total} total batches
                            {searchTerm && ` matching "${searchTerm}"`}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground">Show:</label>
                        <select
                            value={limit}
                            onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable
                        data={batches}
                        columns={tableColumns}
                        loading={isLoading}
                        onEdit={(batch) => {
                            openEditModal(batch);
                            track("Batch Edit Modal Opened", { batchId: batch.id });
                        }}
                        onDelete={(batch) => handleDelete(batch)}
                    />

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t pt-4">
                            <div className="text-sm text-gray-600">
                                Showing {(currentPage - 1) * limit + 1} to{" "}
                                {Math.min(currentPage * limit, total)} of {total} batches
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                <span className="text-sm">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                                    }
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create Batch</DialogTitle>
                    </DialogHeader>
                    <BatchForm
                        departments={departments}
                        onSubmit={handleCreate}
                        onCancel={() => setIsCreateModalOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog
                open={isEditModalOpen}
                onOpenChange={(open) => {
                    setIsEditModalOpen(open);
                    if (!open) setSelectedBatch(null);
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Batch</DialogTitle>
                    </DialogHeader>
                    <BatchForm
                        departments={departments}
                        initialData={selectedBatch}
                        onSubmit={handleEdit}
                        onCancel={() => {
                            setIsEditModalOpen(false);
                            setSelectedBatch(null);
                        }}
                    />
                </DialogContent>
            </Dialog>

            {/* Students Modal */}
            <Dialog
                open={isStudentsModalOpen}
                onOpenChange={(open) => {
                    setIsStudentsModalOpen(open);
                    if (!open) setSelectedBatch(null);
                }}
            >
                <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Manage Students - {selectedBatch?.name}</DialogTitle>
                    </DialogHeader>
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
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Batch</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the batch &quot;{batchToDelete?.name}
                            &quot;? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
