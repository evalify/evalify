"use client";

import * as React from "react";
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type SortingState,
    type ColumnFiltersState,
    type VisibilityState,
    type RowSelectionState,
    type CellContext,
    type HeaderContext,
    type OnChangeFn,
} from "@tanstack/react-table";

import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
    SelectItem,
} from "@/components/ui/select";

function DataTableSkeleton(props: { columns: number; rows?: number }) {
    const rows = props.rows ?? 10;
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        {Array.from({ length: props.columns }).map((_, i) => (
                            <TableHead key={i}>
                                <Skeleton className="h-5 w-24" />
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: rows }).map((_, r) => (
                        <TableRow key={r}>
                            {Array.from({ length: props.columns }).map((__, c) => (
                                <TableCell key={c}>
                                    <Skeleton className="h-5 w-full" />
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export type DataTableProps<TData, TValue> = {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    filterColumn?: string;
    initialPageSize?: number;
    defaultSorting?: SortingState;
    initialFilter?: string;
    enableRowSelection?: boolean;
    isLoading?: boolean;
    skeletonRowCount?: number;

    pageIndex?: number;
    pageSize?: number;
    pageCount?: number;
    onPageIndexChange?: (index: number) => void;
    onPageSizeChange?: (size: number) => void;

    sorting?: SortingState;
    onSortingChange?: OnChangeFn<SortingState>;

    filterValue?: string;
    onFilterChange?: (value: string) => void;
};

export function DataTable<TData, TValue>({
    columns,
    data,
    filterColumn,
    initialPageSize = 10,
    defaultSorting = [],
    initialFilter = "",
    enableRowSelection = false,
    isLoading = false,
    skeletonRowCount = 10,

    pageIndex: cPageIndex,
    pageSize: cPageSize,
    pageCount: cPageCount,
    onPageIndexChange,
    onPageSizeChange,

    sorting: cSorting,
    onSortingChange: cOnSortingChange,

    filterValue: cFilterValue,
    onFilterChange,
}: DataTableProps<TData, TValue>) {
    const [iSorting, iSetSorting] = React.useState<SortingState>(defaultSorting);
    const [iColumnFilters, iSetColumnFilters] = React.useState<ColumnFiltersState>(
        filterColumn && initialFilter ? [{ id: filterColumn, value: initialFilter }] : []
    );
    const [iColumnVisibility, iSetColumnVisibility] = React.useState<VisibilityState>({});
    const [iRowSelection, iSetRowSelection] = React.useState<RowSelectionState>({});
    const [iPageIndex, iSetPageIndex] = React.useState<number>(0);
    const [iPageSize, iSetPageSize] = React.useState<number>(initialPageSize);

    const sorting = cSorting ?? iSorting;
    const pageIndex = cPageIndex ?? iPageIndex;
    const pageSize = cPageSize ?? iPageSize;
    const pageCount = cPageCount ?? -1;

    const columnFilters = iColumnFilters;
    const columnVisibility = iColumnVisibility;
    const rowSelection = iRowSelection;

    const boundFilter =
        cFilterValue ??
        (filterColumn
            ? ((columnFilters.find((f) => f.id === filterColumn)?.value as string | null) ?? "")
            : "");

    const setBoundFilter = (val: string) => {
        if (onFilterChange) {
            onFilterChange(val);
            return;
        }
        if (!filterColumn) return;
        const base = columnFilters.filter((f) => f.id !== filterColumn);
        const next = val ? [...base, { id: filterColumn, value: val }] : base;
        iSetColumnFilters(next);
        (onPageIndexChange ?? iSetPageIndex)(0);
    };

    const computedColumns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
        if (!enableRowSelection) return columns;
        const selectCol: ColumnDef<TData, TValue> = {
            id: "__select",
            header: (ctx: HeaderContext<TData, TValue>) => (
                <Checkbox
                    checked={
                        ctx.table.getIsAllPageRowsSelected() ||
                        (ctx.table.getIsSomePageRowsSelected() ? "indeterminate" : false)
                    }
                    onCheckedChange={(val) => ctx.table.toggleAllPageRowsSelected(Boolean(val))}
                    aria-label="Select all"
                />
            ),
            cell: (ctx: CellContext<TData, TValue>) => (
                <Checkbox
                    checked={ctx.row.getIsSelected()}
                    onCheckedChange={(val) => ctx.row.toggleSelected(Boolean(val))}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
            size: 24,
        };
        return [selectCol, ...columns];
    }, [columns, enableRowSelection]);

    const table = useReactTable({
        data,
        columns: computedColumns,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            pagination: { pageIndex, pageSize },
        },

        onSortingChange: (updater) => {
            const next = typeof updater === "function" ? updater(sorting) : updater;
            if (cOnSortingChange) cOnSortingChange(next);
            else iSetSorting(next);
        },

        onColumnFiltersChange: (updater) => {
            const next = typeof updater === "function" ? updater(columnFilters) : updater;
            iSetColumnFilters(next);
            (onPageIndexChange ?? iSetPageIndex)(0);
        },

        onColumnVisibilityChange: (updater) => {
            const next = typeof updater === "function" ? updater(columnVisibility) : updater;
            iSetColumnVisibility(next);
        },

        onRowSelectionChange: (updater) => {
            const next = typeof updater === "function" ? updater(rowSelection) : updater;
            iSetRowSelection(next);
        },

        onPaginationChange: (updater) => {
            const next = typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;

            if ("pageIndex" in next) {
                (onPageIndexChange ?? iSetPageIndex)(next.pageIndex);
            }
            if ("pageSize" in next) {
                (onPageSizeChange ?? iSetPageSize)(next.pageSize);
                (onPageIndexChange ?? iSetPageIndex)(0);
            }
        },

        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        pageCount,

        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                {filterColumn ? (
                    <Input
                        placeholder={`Filter ${filterColumn}...`}
                        value={boundFilter}
                        onChange={(e) => setBoundFilter(e.target.value)}
                        className="w-[240px]"
                    />
                ) : null}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            View
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                        {table
                            .getAllLeafColumns()
                            .filter((c) => c.id !== "__select")
                            .map((column) => (
                                <DropdownMenuCheckboxItem
                                    key={column.id}
                                    className="capitalize"
                                    checked={column.getIsVisible()}
                                    onCheckedChange={(val) => column.toggleVisibility(Boolean(val))}
                                >
                                    {String(column.id)}
                                </DropdownMenuCheckboxItem>
                            ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {isLoading ? (
                <DataTableSkeleton columns={computedColumns.length} rows={skeletonRowCount} />
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((hg) => (
                                <TableRow key={hg.id}>
                                    {hg.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef.header,
                                                      header.getContext()
                                                  )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>

                        <TableBody>
                            {table.getRowModel().rows.length > 0 ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={computedColumns.length}
                                        className="h-24 text-center"
                                    >
                                        No results.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="flex items-center justify-end gap-3">
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                        aria-label="First page"
                        title="First page"
                    >
                        «
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        aria-label="Previous page"
                        title="Previous page"
                    >
                        ‹
                    </Button>

                    <span className="mx-1 text-sm tabular-nums text-muted-foreground">
                        {table.getState().pagination.pageIndex + 1} /{" "}
                        {table.getPageCount() > 0 ? table.getPageCount() : 1}
                    </span>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        aria-label="Next page"
                        title="Next page"
                    >
                        ›
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.setPageIndex(Math.max(0, table.getPageCount() - 1))}
                        disabled={!table.getCanNextPage()}
                        aria-label="Last page"
                        title="Last page"
                    >
                        »
                    </Button>
                </div>

                <Select
                    value={String(table.getState().pagination.pageSize)}
                    onValueChange={(v) => {
                        const size = Number(v);
                        table.setPageSize(size);
                    }}
                >
                    <SelectTrigger className="h-8 w-[110px]">
                        <SelectValue>{table.getState().pagination.pageSize} / page</SelectValue>
                    </SelectTrigger>
                    <SelectContent align="end">
                        {[10, 20, 30, 40, 50, 100].map((ps) => (
                            <SelectItem key={ps} value={String(ps)}>
                                {ps} / page
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
