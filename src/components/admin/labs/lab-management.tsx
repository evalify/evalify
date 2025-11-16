"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Building2, Plus, Search, Network, Filter } from "lucide-react";
import { LabForm } from "./lab-form";
import { DataTable } from "../shared/data-table";
import { useAnalytics } from "../../../hooks/use-analytics";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ui/custom-alert-dialog";

interface Lab {
    id: string;
    name: string;
    block: string;
    ipSubnet: string;
    isActive: "ACTIVE" | "INACTIVE";
    created_at: Date;
    updated_at: Date | null;
}

export function LabManagement() {
    const { track } = useAnalytics();
    const { success, error } = useToast();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");
    const [blockFilter, setBlockFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingLab, setEditingLab] = useState<string | null>(null);

    // Confirmation dialog state
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [labToDelete, setLabToDelete] = useState<string | null>(null);

    const [limit, setLimit] = useState(5);

    // Queries
    const labsResult = trpc.lab.list.useQuery({
        searchTerm: search || undefined,
        isActive: statusFilter === "ALL" ? undefined : statusFilter,
        block: blockFilter || undefined,
        page: currentPage,
        limit,
    });

    const blocks = trpc.lab.getUniqueBlocks.useQuery();

    // Mutations
    const utils = trpc.useUtils();
    const deleteLab = trpc.lab.delete.useMutation({
        onSuccess: () => {
            utils.lab.list.invalidate();
            success("Lab deleted successfully");
        },
        onError: (err) => {
            error(err.message || "Failed to delete lab");
        },
    });

    const labs = labsResult?.data?.labs || [];
    const total = labsResult?.data?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Clamp currentPage to valid range when data changes
    useEffect(() => {
        if (totalPages > 0 && currentPage > totalPages) {
            setCurrentPage(totalPages);
        } else if (totalPages === 0 && currentPage !== 1) {
            setCurrentPage(1);
        }
    }, [totalPages, currentPage]);

    const handleCreateSuccess = () => {
        setShowCreateModal(false);
        track("Lab Create Modal Closed", { action: "success" });
    };

    const handleEditSuccess = () => {
        setEditingLab(null);
        track("Lab Edit Modal Closed", { action: "success" });
    };

    const handleDelete = async (labId: string) => {
        setLabToDelete(labId);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!labToDelete) return;

        try {
            await deleteLab.mutateAsync({ id: labToDelete });
            track("Lab Deleted", { labId: labToDelete });
        } catch (error) {
            track("Lab Delete Error", {
                error: error instanceof Error ? error.message : "Unknown error",
            });
        } finally {
            setIsDeleteDialogOpen(false);
            setLabToDelete(null);
        }
    };

    const resetFilters = () => {
        setSearch("");
        setStatusFilter("ALL");
        setBlockFilter("");
        setCurrentPage(1);
        track("Lab Filters Reset");
    };

    const columns = [
        {
            key: "name" as keyof Lab,
            label: "Lab Name",
            sortable: true,
            render: (_value: unknown, lab: Lab) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                        <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                            {lab.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{lab.block}</div>
                    </div>
                </div>
            ),
        },
        {
            key: "ipSubnet" as keyof Lab,
            label: "IP Subnet",
            sortable: true,
            render: (_value: unknown, lab: Lab) => (
                <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <code className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-1 text-sm font-mono text-gray-900 dark:text-gray-100">
                        {lab.ipSubnet}
                    </code>
                </div>
            ),
        },
        {
            key: "isActive" as keyof Lab,
            label: "Status",
            sortable: true,
            render: (_value: unknown, lab: Lab) => (
                <Badge variant={lab.isActive === "ACTIVE" ? "default" : "destructive"}>
                    {lab.isActive}
                </Badge>
            ),
        },
        {
            key: "created_at" as keyof Lab,
            label: "Created",
            sortable: true,
            render: (_value: unknown, lab: Lab) => (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(lab.created_at).toLocaleDateString()}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Lab Management</h2>
                    <p className="text-gray-600">
                        Manage computer labs and their network configurations
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setShowCreateModal(true);
                        track("Lab Create Initiated");
                    }}
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Lab
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                    </CardTitle>
                    <CardDescription>
                        Filter labs by name, block, department, or status
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                        <div className="space-y-3">
                            <label className="text-sm font-medium">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search labs..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
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

                        <div className="space-y-3">
                            <label className="text-sm font-medium">Block</label>
                            <select
                                value={blockFilter}
                                onChange={(e) => {
                                    setBlockFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="">All Blocks</option>
                                {blocks.data?.map((block) => (
                                    <option key={block} value={block}>
                                        {block}
                                    </option>
                                ))}
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

            {/* Labs Table */}
            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle>Labs</CardTitle>
                        <CardDescription>
                            {total} total labs
                            {search && ` matching "${search}"`}
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
                        data={labs}
                        columns={columns}
                        loading={labsResult.isLoading}
                        onEdit={(lab) => {
                            setEditingLab(lab.id);
                            track("Lab Edit Modal Opened", { labId: lab.id });
                        }}
                        onDelete={(lab) => handleDelete(lab.id)}
                    />

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t pt-4">
                            <div className="text-sm text-gray-600">
                                Showing {(currentPage - 1) * limit + 1} to{" "}
                                {Math.min(currentPage * limit, total)} of {total} labs
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

            {/* Create Lab Modal */}
            <Dialog
                open={showCreateModal}
                onOpenChange={(open) => {
                    setShowCreateModal(open);
                    if (!open) track("Lab Create Modal Closed", { action: "cancel" });
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create New Lab</DialogTitle>
                    </DialogHeader>
                    <LabForm
                        onSuccess={handleCreateSuccess}
                        onCancel={() => {
                            setShowCreateModal(false);
                            track("Lab Create Modal Closed", { action: "cancel" });
                        }}
                    />
                </DialogContent>
            </Dialog>

            {/* Edit Lab Modal */}
            <Dialog
                open={!!editingLab}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditingLab(null);
                        track("Lab Edit Modal Closed", { action: "cancel" });
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Lab</DialogTitle>
                    </DialogHeader>
                    {editingLab && (
                        <LabForm
                            labId={editingLab}
                            onSuccess={handleEditSuccess}
                            onCancel={() => {
                                setEditingLab(null);
                                track("Lab Edit Modal Closed", { action: "cancel" });
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Lab Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                title="Delete Lab"
                message="Are you sure you want to delete this lab? This action cannot be undone."
                onAccept={confirmDelete}
                confirmButtonText="Delete"
                cancelButtonText="Cancel"
            />
        </div>
    );
}
