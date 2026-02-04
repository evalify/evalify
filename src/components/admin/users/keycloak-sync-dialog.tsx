"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Database, RefreshCw, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface KeycloakSyncDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSyncComplete?: () => void;
}

interface UnsyncedUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    username: string;
    enabled: boolean;
    roles: string[];
    groups: string[];
    profileId: string;
    phoneNumber: string;
}

export function KeycloakSyncDialog({ isOpen, onClose, onSyncComplete }: KeycloakSyncDialogProps) {
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const toast = useToast();
    const { track } = useAnalytics();

    // Fetch sync stats
    const {
        data: syncStats,
        isLoading,
        refetch,
    } = trpc.user.getSyncStats.useQuery(undefined, {
        enabled: isOpen,
    });

    // Sync mutation
    const utils = trpc.useUtils();
    const syncMutation = trpc.user.syncFromKeycloak.useMutation({
        onSuccess: (data) => {
            toast.success(data.message || "Users synced successfully");
            track("keycloak_users_synced", { count: data.syncedCount });
            utils.user.list.invalidate();
            utils.user.getSyncStats.invalidate();
            setSelectedUserIds([]);
            onSyncComplete?.();
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to sync users");
            track("keycloak_sync_failed", { error: error.message });
        },
    });

    const handleSelectAll = (checked: boolean) => {
        if (checked && syncStats?.unsyncedUsers) {
            setSelectedUserIds(syncStats.unsyncedUsers.map((user) => user.id));
        } else {
            setSelectedUserIds([]);
        }
    };

    const handleSelectUser = (userId: string, checked: boolean) => {
        if (checked) {
            setSelectedUserIds((prev) => [...prev, userId]);
        } else {
            setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
        }
    };

    const handleSync = async () => {
        if (selectedUserIds.length === 0) {
            toast.error("Please select at least one user to sync");
            return;
        }

        track("keycloak_sync_initiated", { userCount: selectedUserIds.length });
        await syncMutation.mutateAsync({ userIds: selectedUserIds });
    };

    const handleSyncAll = async () => {
        track("keycloak_sync_all_initiated", { userCount: syncStats?.unsyncedUserCount || 0 });
        await syncMutation.mutateAsync({});
    };

    const handleClose = () => {
        if (!syncMutation.isPending) {
            setSelectedUserIds([]);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-7xl max-h-[85vh] flex flex-col p-0 gap-0">
                {/* Header Section with Gradient */}
                <div className="relative bg-linear-to-r from-blue-600 via-purple-600 to-cyan-600 dark:from-blue-700 dark:via-purple-700 dark:to-cyan-700 px-6 py-8 rounded-t-lg">
                    <div className="absolute inset-0 bg-black/10 rounded-t-lg"></div>
                    <div className="relative z-10">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3 text-2xl text-white">
                                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                                    <RefreshCw className="h-6 w-6" />
                                </div>
                                Keycloak User Sync
                            </DialogTitle>
                            <DialogDescription className="text-blue-50 mt-2">
                                Import and synchronize users from your Keycloak identity provider
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 overflow-auto px-6 py-6 space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border-2 hover:shadow-lg transition-all duration-300 overflow-hidden">
                            <div className="h-1 bg-linear-to-r from-blue-500 to-blue-600"></div>
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Keycloak Users
                                        </p>
                                        <p className="text-3xl font-bold">
                                            {isLoading ? (
                                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                            ) : (
                                                <span className="bg-linear-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                                                    {syncStats?.keycloakUserCount || 0}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-blue-100 dark:bg-blue-950/30 rounded-2xl">
                                        <Users className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-2 hover:shadow-lg transition-all duration-300 overflow-hidden">
                            <div className="h-1 bg-linear-to-r from-green-500 to-green-600"></div>
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Synced Users
                                        </p>
                                        <p className="text-3xl font-bold">
                                            {isLoading ? (
                                                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                                            ) : (
                                                <span className="bg-linear-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                                                    {syncStats?.dbUserCount || 0}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-green-100 dark:bg-green-950/30 rounded-2xl">
                                        <Database className="h-7 w-7 text-green-600 dark:text-green-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-2 hover:shadow-lg transition-all duration-300 overflow-hidden">
                            <div className="h-1 bg-linear-to-r from-orange-500 to-orange-600"></div>
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Pending Sync
                                        </p>
                                        <p className="text-3xl font-bold">
                                            {isLoading ? (
                                                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                                            ) : (
                                                <span className="bg-linear-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent">
                                                    {syncStats?.unsyncedUserCount || 0}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-orange-100 dark:bg-orange-950/30 rounded-2xl">
                                        <AlertCircle className="h-7 w-7 text-orange-600 dark:text-orange-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Unsynced Users List or Success Message */}
                    {isLoading ? (
                        <Card>
                            <CardContent className="p-12 flex flex-col items-center justify-center">
                                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                                <p className="text-muted-foreground">Loading user data...</p>
                            </CardContent>
                        </Card>
                    ) : syncStats && syncStats.unsyncedUserCount > 0 ? (
                        <Card className="border-2">
                            <CardContent className="p-6 space-y-4">
                                {/* Selection Header */}
                                <div className="flex items-center justify-between pb-3 border-b">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id="select-all"
                                            checked={
                                                selectedUserIds.length ===
                                                    syncStats.unsyncedUsers.length &&
                                                syncStats.unsyncedUsers.length > 0
                                            }
                                            onCheckedChange={handleSelectAll}
                                            className="h-5 w-5"
                                        />
                                        <label
                                            htmlFor="select-all"
                                            className="text-sm font-semibold cursor-pointer select-none"
                                        >
                                            Select All Users
                                        </label>
                                    </div>
                                    <Badge variant="secondary" className="px-3 py-1">
                                        {selectedUserIds.length} of {syncStats.unsyncedUsers.length}{" "}
                                        selected
                                    </Badge>
                                </div>

                                {/* User List */}
                                <ScrollArea className="h-80 pr-4">
                                    <div className="space-y-2">
                                        {/* <pre>{JSON.stringify(syncStats.unsyncedUsers, null, 2)}</pre> */}
                                        {syncStats.unsyncedUsers.map((user: UnsyncedUser) => (
                                            <div
                                                key={user.id}
                                                className="group flex items-center gap-4 p-4 rounded-xl border-2 border-transparent hover:border-primary/20 bg-muted/30 hover:bg-muted/50 transition-all duration-200"
                                            >
                                                <Checkbox
                                                    id={user.id}
                                                    checked={selectedUserIds.includes(user.id)}
                                                    onCheckedChange={(checked) =>
                                                        handleSelectUser(
                                                            user.id,
                                                            checked as boolean
                                                        )
                                                    }
                                                    className="h-5 w-5"
                                                />
                                                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <div className="space-y-1">
                                                        <p className="font-semibold text-sm">
                                                            {user.firstName || user.lastName
                                                                ? `${user.firstName} ${user.lastName}`.trim()
                                                                : user.username}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                    {user.profileId && (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground">
                                                                Profile ID
                                                            </p>
                                                            <p className="text-xs font-mono bg-background px-2 py-1 rounded">
                                                                {user.profileId}
                                                            </p>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs"
                                                        >
                                                            {user.groups.includes("admin")
                                                                ? "Admin"
                                                                : user.groups.includes("manager")
                                                                  ? "Manager"
                                                                  : user.groups.includes("faculty")
                                                                    ? "Faculty"
                                                                    : user.groups.includes(
                                                                            "student"
                                                                        )
                                                                      ? "Student"
                                                                      : "Student"}
                                                        </Badge>

                                                        {user.roles.length > 2 && (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-xs"
                                                            >
                                                                +{user.roles.length - 2}
                                                            </Badge>
                                                        )}
                                                        {!user.enabled && (
                                                            <Badge
                                                                variant="destructive"
                                                                className="text-xs"
                                                            >
                                                                Disabled
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-2 border-green-200 dark:border-green-800">
                            <CardContent className="p-12 flex flex-col items-center justify-center text-center">
                                <div className="p-4 bg-green-100 dark:bg-green-950/30 rounded-full mb-4">
                                    <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">All Synced!</h3>
                                <p className="text-muted-foreground max-w-md">
                                    All Keycloak users are already synchronized with the database.
                                    No action needed.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="border-t bg-muted/30 px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            disabled={syncMutation.isPending}
                            className="min-w-24"
                        >
                            Cancel
                        </Button>
                        <div className="flex gap-3">
                            {syncStats && syncStats.unsyncedUserCount > 0 && (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={handleSyncAll}
                                        disabled={syncMutation.isPending}
                                        className="min-w-32"
                                    >
                                        {syncMutation.isPending ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Syncing...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="mr-2 h-4 w-4" />
                                                Sync All ({syncStats.unsyncedUserCount})
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        onClick={handleSync}
                                        disabled={
                                            selectedUserIds.length === 0 || syncMutation.isPending
                                        }
                                        className="min-w-40 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                    >
                                        {syncMutation.isPending ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Syncing...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="mr-2 h-4 w-4" />
                                                Sync Selected ({selectedUserIds.length})
                                            </>
                                        )}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
