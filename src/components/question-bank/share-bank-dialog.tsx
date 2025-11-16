"use client";

import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BankListItem } from "@/types/bank";
import { trpc } from "@/lib/trpc/client";
import { Loader2, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useVirtualizer } from "@tanstack/react-virtual";

interface ShareBankDialogProps {
    bank: BankListItem;
    isOpen: boolean;
    onClose: () => void;
}

export function ShareBankDialog({ bank, isOpen, onClose }: ShareBankDialogProps) {
    const utils = trpc.useUtils();
    const { error, success } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [accessLevel, setAccessLevel] = useState<"READ" | "WRITE">("WRITE");

    const { data: searchResults = [], isLoading: isSearching } = trpc.bank.searchUsers.useQuery(
        {
            searchTerm: searchQuery,
        },
        {
            enabled: searchQuery.length >= 2,
        }
    );

    const { data: sharedUsers = [] } = trpc.bank.getSharedUsers.useQuery(
        {
            bankId: bank.id,
        },
        {
            enabled: isOpen,
        }
    );

    const shareBank = trpc.bank.shareBank.useMutation({
        onSuccess: () => {
            success("Bank shared successfully!");
            utils.bank.getSharedUsers.invalidate({ bankId: bank.id });
            utils.bank.list.invalidate();
            setSelectedUsers([]);
            setSearchQuery("");
        },
        onError: (err) => {
            error(err.message || "Failed to share bank");
        },
    });

    const unshareBank = trpc.bank.unshareBank.useMutation({
        onSuccess: () => {
            success("Share removed successfully!");
            utils.bank.getSharedUsers.invalidate({ bankId: bank.id });
            utils.bank.list.invalidate();
        },
        onError: (err) => {
            error(err.message || "Failed to remove share");
        },
    });

    const updateAccessLevel = trpc.bank.updateAccessLevel.useMutation({
        onSuccess: () => {
            success("Permission updated successfully!");
            utils.bank.getSharedUsers.invalidate({ bankId: bank.id });
        },
        onError: (err) => {
            error(err.message || "Failed to update permission");
        },
    });

    const handleShare = () => {
        if (selectedUsers.length > 0) {
            shareBank.mutate({
                bankId: bank.id,
                userIds: selectedUsers,
                accessLevel,
            });
        }
    };

    const toggleUser = (userId: string) => {
        setSelectedUsers((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
    };

    const alreadySharedIds = useMemo(() => sharedUsers.map((s) => s.userId), [sharedUsers]);

    const filteredResults = useMemo(
        () =>
            searchResults.filter(
                (u) => !alreadySharedIds.includes(u.id) && u.id !== bank.creator?.id
            ),
        [searchResults, alreadySharedIds, bank.creator?.id]
    );

    const parentRef = useRef<HTMLDivElement>(null);

    // eslint-disable-next-line react-hooks/incompatible-library
    const virtualizer = useVirtualizer({
        count: filteredResults.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 60,
        overscan: 8,
    });

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    setSelectedUsers([]);
                    setSearchQuery("");
                    setAccessLevel("WRITE");
                    onClose();
                }
            }}
        >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Share Question Bank</DialogTitle>
                    <DialogDescription>
                        Share &quot;{bank.name}&quot; with faculty or managers
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="search">Search Users</Label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="search"
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>

                    {searchQuery.length >= 2 && (
                        <div className="border rounded-md overflow-hidden">
                            {isSearching ? (
                                <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                            ) : filteredResults.length > 0 ? (
                                <div
                                    ref={parentRef}
                                    className="overflow-y-auto"
                                    style={{ height: 192, maxHeight: 192 }}
                                >
                                    <div
                                        style={{
                                            height: virtualizer.getTotalSize(),
                                            width: "100%",
                                            position: "relative",
                                        }}
                                    >
                                        {virtualizer.getVirtualItems().map((vi) => {
                                            const user = filteredResults[vi.index];

                                            return (
                                                <div
                                                    key={user.id}
                                                    style={{
                                                        position: "absolute",
                                                        top: 0,
                                                        left: 0,
                                                        width: "100%",
                                                        height: `${vi.size}px`,
                                                        transform: `translateY(${vi.start}px)`,
                                                    }}
                                                >
                                                    <div
                                                        className="flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer mx-2"
                                                        onClick={() => toggleUser(user.id)}
                                                    >
                                                        <div className="flex-1">
                                                            <div className="font-medium">
                                                                {user.name}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {user.email}
                                                            </div>
                                                        </div>
                                                        <Badge variant="outline">{user.role}</Badge>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedUsers.includes(
                                                                user.id
                                                            )}
                                                            onChange={() => toggleUser(user.id)}
                                                            className="ml-2 rounded border-gray-300 cursor-pointer"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 text-center text-muted-foreground">
                                    No users found
                                </div>
                            )}
                        </div>
                    )}

                    {selectedUsers.length > 0 && (
                        <div className="space-y-2">
                            <Label>Permission Level</Label>
                            <Select
                                value={accessLevel}
                                onValueChange={(value) => setAccessLevel(value as "READ" | "WRITE")}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="WRITE">
                                        Write - Can view and modify
                                    </SelectItem>
                                    <SelectItem value="READ">Read - Read only access</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {sharedUsers.length > 0 && (
                        <div className="space-y-2">
                            <Label>Currently Shared With</Label>
                            <div className="border rounded-md p-2 max-h-48 overflow-y-auto">
                                {sharedUsers.map((share) => (
                                    <div
                                        key={share.userId}
                                        className="flex items-center justify-between p-2 hover:bg-accent rounded-md gap-2"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">
                                                {share.user?.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {share.user?.email}
                                            </div>
                                        </div>
                                        <Select
                                            value={share.accessLevel}
                                            onValueChange={(newAccessLevel) =>
                                                updateAccessLevel.mutate({
                                                    bankId: bank.id,
                                                    userId: share.userId,
                                                    accessLevel: newAccessLevel as "READ" | "WRITE",
                                                })
                                            }
                                            disabled={updateAccessLevel.isPending}
                                        >
                                            <SelectTrigger className="w-32">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="WRITE">Write</SelectItem>
                                                <SelectItem value="READ">Read</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                unshareBank.mutate({
                                                    bankId: bank.id,
                                                    userId: share.userId,
                                                })
                                            }
                                            disabled={unshareBank.isPending}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">
                            Close
                        </Button>
                    </DialogClose>
                    <Button
                        onClick={handleShare}
                        disabled={selectedUsers.length === 0 || shareBank.isPending}
                    >
                        {shareBank.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sharing...
                            </>
                        ) : (
                            `Share with ${selectedUsers.length} user${
                                selectedUsers.length !== 1 ? "s" : ""
                            }`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
