"use client";

import { useState } from "react";
import Image from "next/image";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { User, Plus, Search, Filter } from "lucide-react";
import { Modal } from "@/components/admin/shared/modal";
import { DataTable } from "@/components/admin/shared/data-table";
import { UserForm } from "./user-form";
import { useAnalytics } from "@/hooks/use-analytics";

interface User {
    id: number;
    name: string;
    email: string;
    profileId: string;
    profileImage?: string | null;
    role: "ADMIN" | "FACULTY" | "STUDENT" | "MANAGER";
    phoneNumber: string | null;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    createdAt: Date;
    updatedAt?: Date;
}

export function UserManagement() {
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<
        "ALL" | "ADMIN" | "FACULTY" | "STUDENT" | "MANAGER"
    >("ALL");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE" | "SUSPENDED">(
        "ALL"
    );
    const [currentPage, setCurrentPage] = useState(1);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const { track } = useAnalytics();
    const { success, error } = useToast();

    const limit = 15;

    // Queries with server-side filtering
    const usersResult = trpc.user.list.useQuery({
        searchTerm: searchTerm || undefined,
        role: roleFilter === "ALL" ? undefined : roleFilter,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        page: currentPage,
        limit,
    });

    const users: User[] = (usersResult?.data?.users || []).map((user) => ({
        ...user,
        createdAt: user.created_at,
        updatedAt: user.updated_at || undefined,
        profileImage: user.profileImage || null,
        phoneNumber: user.phoneNumber || null,
    }));
    const total = usersResult?.data?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Mutations
    const utils = trpc.useUtils();
    const createUser = trpc.user.create.useMutation({
        onSuccess: () => {
            utils.user.list.invalidate();
            success("User created successfully");
        },
        onError: (err) => {
            error(err.message || "Failed to create user");
        },
    });
    const updateUser = trpc.user.update.useMutation({
        onSuccess: () => {
            utils.user.list.invalidate();
            success("User updated successfully");
        },
        onError: (err) => {
            error(err.message || "Failed to update user");
        },
    });
    const deleteUser = trpc.user.delete.useMutation({
        onSuccess: () => {
            utils.user.list.invalidate();
            success("User deactivated successfully");
        },
        onError: (err) => {
            error(err.message || "Failed to deactivate user");
        },
    });

    const handleCreate = async (data: {
        name: string;
        email: string;
        profileId: string;
        profileImage?: string;
        role: "ADMIN" | "FACULTY" | "STUDENT" | "MANAGER";
        phoneNumber?: string;
        status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    }) => {
        try {
            await createUser.mutateAsync(data);
            setIsCreateModalOpen(false);
            track("user_created", { email: data.email, role: data.role });
        } catch (error) {
            console.error("Error creating user:", error);
        }
    };

    const handleEdit = async (data: {
        name: string;
        email: string;
        profileId: string;
        profileImage?: string;
        role: "ADMIN" | "FACULTY" | "STUDENT" | "MANAGER";
        phoneNumber?: string;
        status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    }) => {
        if (!selectedUser) return;

        try {
            await updateUser.mutateAsync({
                id: selectedUser.id,
                ...data,
            });
            setIsEditModalOpen(false);
            setSelectedUser(null);
            track("user_updated", { id: selectedUser.id });
        } catch (error) {
            console.error("Error updating user:", error);
        }
    };

    const handleDelete = async (user: User) => {
        if (
            confirm(
                `Are you sure you want to deactivate "${user.name} (${user.email})"?\n\nThis will set their status to inactive.`
            )
        ) {
            try {
                await deleteUser.mutateAsync({ id: user.id });
                track("user_deleted", { id: user.id });
            } catch (error) {
                console.error("Error deleting user:", error);
            }
        }
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };

    const resetFilters = () => {
        setSearchTerm("");
        setRoleFilter("ALL");
        setStatusFilter("ALL");
        setCurrentPage(1);
        track("User Filters Reset");
    };

    // Table columns
    const tableColumns = [
        {
            key: "name" as keyof User,
            label: "User",
            sortable: true,
            render: (_value: unknown, user: User) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                        {user.profileImage ? (
                            <Image
                                src={user.profileImage}
                                alt={user.name}
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded-lg object-cover"
                            />
                        ) : (
                            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        )}
                    </div>
                    <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                            {user.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                    </div>
                </div>
            ),
        },
        {
            key: "profileId" as keyof User,
            label: "Profile ID",
            sortable: true,
            render: (_value: unknown, user: User) => (
                <code className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-1 text-sm font-mono text-gray-900 dark:text-gray-100">
                    {user.profileId}
                </code>
            ),
        },
        {
            key: "role" as keyof User,
            label: "Role",
            sortable: true,
            render: (_value: unknown, user: User) => (
                <Badge variant={user.role === "ADMIN" ? "destructive" : "default"}>
                    {user.role}
                </Badge>
            ),
        },
        {
            key: "phoneNumber" as keyof User,
            label: "Phone",
            sortable: true,
        },
        {
            key: "status" as keyof User,
            label: "Status",
            sortable: true,
            render: (_value: unknown, user: User) => (
                <Badge variant={user.status === "ACTIVE" ? "default" : "destructive"}>
                    {user.status}
                </Badge>
            ),
        },
        {
            key: "createdAt" as keyof User,
            label: "Created",
            sortable: true,
            render: (_value: unknown, user: User) => (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                </div>
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
                                Users
                            </h2>
                            <p className="text-muted-foreground">
                                Manage users, roles, and permissions
                            </p>
                        </div>
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-black hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Create User
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
                        Filter users by name, email, role, or status
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
                                    placeholder="Search users..."
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
                            <label className="text-sm font-medium">Role</label>
                            <select
                                value={roleFilter}
                                onChange={(e) => {
                                    setRoleFilter(
                                        e.target.value as
                                            | "ALL"
                                            | "ADMIN"
                                            | "FACULTY"
                                            | "STUDENT"
                                            | "MANAGER"
                                    );
                                    setCurrentPage(1);
                                }}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="ALL">All Roles</option>
                                <option value="ADMIN">Admin</option>
                                <option value="FACULTY">Faculty</option>
                                <option value="STUDENT">Student</option>
                                <option value="MANAGER">Manager</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(
                                        e.target.value as
                                            | "ALL"
                                            | "ACTIVE"
                                            | "INACTIVE"
                                            | "SUSPENDED"
                                    );
                                    setCurrentPage(1);
                                }}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="ALL">All Status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                                <option value="SUSPENDED">Suspended</option>
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
                            <h3 className="text-lg font-semibold">Users</h3>
                            <p className="text-sm text-muted-foreground">
                                {total} total users
                                {searchTerm && ` matching "${searchTerm}"`}
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable
                        data={users}
                        columns={tableColumns}
                        onEdit={openEditModal}
                        onDelete={handleDelete}
                        loading={usersResult.isLoading}
                    />

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t pt-4">
                            <div className="text-sm text-gray-600">
                                Showing {(currentPage - 1) * limit + 1} to{" "}
                                {Math.min(currentPage * limit, total)} of {total} users
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
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create User"
            >
                <UserForm onSubmit={handleCreate} onCancel={() => setIsCreateModalOpen(false)} />
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                }}
                title="Edit User"
            >
                <UserForm
                    initialData={selectedUser}
                    onSubmit={handleEdit}
                    onCancel={() => {
                        setIsEditModalOpen(false);
                        setSelectedUser(null);
                    }}
                />
            </Modal>
        </div>
    );
}
