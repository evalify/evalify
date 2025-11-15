import { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, Share2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { BankListItem } from "@/types/bank";

export const getColumns = (
    onEdit?: (bank: BankListItem) => void,
    onDelete?: (bankId: string) => void,
    onShare?: (bank: BankListItem) => void,
    currentUserId?: string
): ColumnDef<BankListItem>[] => {
    return [
        {
            id: "select",
            header: ({ table }) => (
                <div className="flex justify-center p-2">
                    <input
                        type="checkbox"
                        checked={table.getIsAllPageRowsSelected()}
                        onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
                        className="rounded border-gray-300 cursor-pointer"
                        aria-label="Select all rows"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="flex justify-center p-2" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        onChange={(e) => row.toggleSelected(e.target.checked)}
                        className="rounded border-gray-300 cursor-pointer"
                        aria-label="Select row"
                    />
                </div>
            ),
            enableSorting: false,
            enableHiding: false,
            size: 50,
        },
        {
            accessorKey: "name",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Bank Name" />,
            cell: ({ row }) => {
                const bank = row.original;
                return (
                    <div>
                        <div className="font-medium">{bank.name}</div>
                        {bank.courseCode && (
                            <div className="text-xs text-muted-foreground">
                                Code: {bank.courseCode}
                            </div>
                        )}
                    </div>
                );
            },
            meta: { label: "Bank Name" },
            size: 250,
            enableSorting: true,
        },
        {
            accessorKey: "semester",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Semester" className="text-center" />
            ),
            cell: ({ row }) => {
                return <div className="text-center">{row.getValue("semester")}</div>;
            },
            meta: { label: "Semester" },
            size: 100,
            enableSorting: true,
        },
        {
            accessorKey: "creator",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Owner" className="text-center" />
            ),
            cell: ({ row }) => {
                const creator = row.original.creator;
                if (!creator) {
                    return <div className="text-center text-muted-foreground">-</div>;
                }
                return (
                    <div className="text-center">
                        <div className="font-medium">{creator.name}</div>
                        <div className="text-xs text-muted-foreground">{creator.email}</div>
                    </div>
                );
            },
            meta: { label: "Owner" },
            size: 200,
            enableSorting: false,
        },
        {
            accessorKey: "accessLevel",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Access" className="text-center" />
            ),
            cell: ({ row }) => {
                const accessLevel = row.getValue("accessLevel") as string;
                const variant =
                    accessLevel === "OWNER"
                        ? "default"
                        : accessLevel === "WRITE"
                          ? "secondary"
                          : "outline";
                return (
                    <div className="text-center">
                        <Badge variant={variant}>{accessLevel}</Badge>
                    </div>
                );
            },
            meta: { label: "Access" },
            size: 100,
            enableSorting: false,
        },
        {
            accessorKey: "sharedCount",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Shared" className="text-center" />
            ),
            cell: ({ row }) => {
                const count = row.getValue("sharedCount") as number;
                return (
                    <div className="text-center">
                        {count > 0 ? (
                            <Badge variant="outline" className="text-xs">
                                {count} {count === 1 ? "user" : "users"}
                            </Badge>
                        ) : (
                            <span className="text-muted-foreground">-</span>
                        )}
                    </div>
                );
            },
            meta: { label: "Shared" },
            size: 100,
            enableSorting: false,
        },
        {
            id: "actions",
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => {
                const bank = row.original;
                const isOwner = currentUserId === bank.creator?.id;
                const canEdit = bank.accessLevel === "OWNER" || bank.accessLevel === "WRITE";

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 mx-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {isOwner && (
                                <DropdownMenuItem
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        onShare?.(bank);
                                    }}
                                >
                                    <Share2 className="mr-2 h-4 w-4" />
                                    Share Bank
                                </DropdownMenuItem>
                            )}
                            {canEdit && (
                                <DropdownMenuItem
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        onEdit?.(bank);
                                    }}
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Bank
                                </DropdownMenuItem>
                            )}
                            {isOwner && (
                                <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        onDelete?.(bank.id);
                                    }}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Bank
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
            enableSorting: false,
            enableHiding: false,
            meta: { label: "Actions" },
        },
    ];
};
