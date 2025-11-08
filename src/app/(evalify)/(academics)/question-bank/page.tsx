"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { getColumns } from "@/components/question-bank/bank-column";
import { BankDialog } from "@/components/question-bank/bank-dialog";
import { DeleteBankDialog } from "@/components/question-bank/delete-bank-dialog";
import { ShareBankDialog } from "@/components/question-bank/share-bank-dialog";
import { BankListItem } from "@/types/bank";
import { useSession } from "next-auth/react";
import { DataTable } from "@/components/ui/data-table";
import AuthGuard from "@/components/auth/auth-guard";
import { UserType } from "@/lib/auth/utils";

export default function QuestionBankPage() {
    const [selectedBank, setSelectedBank] = useState<BankListItem | undefined>();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [bankToDelete, setBankToDelete] = useState<string | null>(null);
    const [bankToShare, setBankToShare] = useState<BankListItem | null>(null);
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [filterValue, setFilterValue] = useState("");
    const { data: session } = useSession();

    const { data: banksData, isLoading } = trpc.bank.list.useQuery({
        searchTerm: filterValue || undefined,
        limit: pageSize,
        offset: pageIndex * pageSize,
    });

    const rows = banksData?.rows || [];
    const pageCount = banksData?.pageCount || 0;

    const handleEdit = (bank: BankListItem) => {
        setSelectedBank(bank);
        setIsEditDialogOpen(true);
    };

    const handleDelete = (bankId: string) => {
        setBankToDelete(bankId);
        setIsDeleteDialogOpen(true);
    };

    const handleShare = (bank: BankListItem) => {
        setBankToShare(bank);
        setIsShareDialogOpen(true);
    };

    const columns = getColumns(handleEdit, handleDelete, handleShare, session?.user?.id);

    return (
        <AuthGuard requiredGroups={[UserType.MANAGER, UserType.STAFF]}>
            <div className="container mx-auto py-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Question Banks</h1>
                        <p className="text-muted-foreground mt-2">
                            Manage question banks for different courses and semesters
                        </p>
                    </div>
                    <BankDialog mode="create" />
                </div>

                <DataTable
                    columns={columns}
                    data={rows}
                    filterColumn="name"
                    initialPageSize={10}
                    isLoading={isLoading}
                    enableRowSelection={false}
                    pageIndex={pageIndex}
                    pageSize={pageSize}
                    pageCount={pageCount}
                    onPageIndexChange={setPageIndex}
                    onPageSizeChange={(size) => {
                        setPageSize(size);
                        setPageIndex(0);
                    }}
                    filterValue={filterValue}
                    onFilterChange={(value) => {
                        setFilterValue(value);
                        setPageIndex(0);
                    }}
                />

                {selectedBank && (
                    <BankDialog
                        bank={selectedBank}
                        isOpen={isEditDialogOpen}
                        onClose={() => {
                            setIsEditDialogOpen(false);
                            setSelectedBank(undefined);
                        }}
                        mode="edit"
                    />
                )}

                {bankToDelete && (
                    <DeleteBankDialog
                        bankId={bankToDelete}
                        isOpen={isDeleteDialogOpen}
                        onClose={() => {
                            setIsDeleteDialogOpen(false);
                            setBankToDelete(null);
                        }}
                    />
                )}

                {bankToShare && (
                    <ShareBankDialog
                        bank={bankToShare}
                        isOpen={isShareDialogOpen}
                        onClose={() => {
                            setIsShareDialogOpen(false);
                            setBankToShare(null);
                        }}
                    />
                )}
            </div>
        </AuthGuard>
    );
}
