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
    type Header,
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
import { Separator } from "@/components/ui/separator";
import { GripVertical } from "lucide-react";

function DataTableResizer<TData, TValue>({ header }: { header: Header<TData, TValue> }) {
    const isResizing = header.column.getIsResizing();

    return (
        <div
            onMouseDown={header.getResizeHandler()}
            onTouchStart={header.getResizeHandler()}
            className={`absolute right-0 top-0 flex h-full w-4 cursor-col-resize select-none touch-none items-center justify-center opacity-0 group-hover/th:opacity-100 z-10 ${
                isResizing ? "opacity-100" : ""
            }`}
            aria-hidden="true"
            data-resizing={isResizing ? "true" : undefined}
        >
            <div className="flex h-4/5 items-center justify-center">
                <Separator
                    orientation="vertical"
                    decorative={false}
                    className={`h-4/5 w-0.5 transition-colors duration-200 ${
                        isResizing ? "bg-primary" : "bg-border"
                    }`}
                />
                <GripVertical
                    className={`absolute h-4 w-4 ${
                        isResizing ? "text-primary" : "text-muted-foreground/70"
                    }`}
                    strokeWidth={1.5}
                />
            </div>
        </div>
    );
}

function DataTableSkeleton(props: { columns: number; rows?: number }) {
    const rows = props.rows ?? 10;
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        {Array.from({ length: props.columns }).map((_, i) => (
                            <TableHead key={i} className="text-center">
                                <Skeleton className="h-5 w-24 mx-auto" />
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: rows }).map((_, r) => (
                        <TableRow key={r}>
                            {Array.from({ length: props.columns }).map((__, c) => (
                                <TableCell key={c} className="text-center">
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

    onRowClick?: (row: TData) => void;
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

    onRowClick,
}: DataTableProps<TData, TValue>) {
    const [iSorting, iSetSorting] = React.useState<SortingState>(defaultSorting);
    const [iColumnFilters, iSetColumnFilters] = React.useState<ColumnFiltersState>(
        filterColumn && initialFilter ? [{ id: filterColumn, value: initialFilter }] : []
    );
    const [iColumnVisibility, iSetColumnVisibility] = React.useState<VisibilityState>({});
    const [iRowSelection, iSetRowSelection] = React.useState<RowSelectionState>({});
    const [iPageIndex, iSetPageIndex] = React.useState<number>(0);
    const [iPageSize, iSetPageSize] = React.useState<number>(initialPageSize);
    const [columnSizing, setColumnSizing] = React.useState({});

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
                <div className="flex justify-center">
                    <Checkbox
                        checked={
                            ctx.table.getIsAllPageRowsSelected() ||
                            (ctx.table.getIsSomePageRowsSelected() ? "indeterminate" : false)
                        }
                        onCheckedChange={(val) => ctx.table.toggleAllPageRowsSelected(Boolean(val))}
                        aria-label="Select all"
                    />
                </div>
            ),
            cell: (ctx: CellContext<TData, TValue>) => (
                <div className="flex justify-center">
                    <Checkbox
                        checked={ctx.row.getIsSelected()}
                        onCheckedChange={(val) => ctx.row.toggleSelected(Boolean(val))}
                        aria-label="Select row"
                    />
                </div>
            ),
            enableSorting: false,
            enableHiding: false,
            size: 60,
            enableResizing: false,
        };
        return [selectCol, ...columns];
    }, [columns, enableRowSelection]);

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns: computedColumns,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            pagination: { pageIndex, pageSize },
            columnSizing,
        },

        onColumnSizingChange: setColumnSizing,
        columnResizeMode: "onChange",
        enableColumnResizing: true,

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
            const current = { pageIndex, pageSize };
            const next = typeof updater === "function" ? updater(current) : updater;

            // Check if pageSize changed - if so, reset to first page
            if ("pageSize" in next && next.pageSize !== current.pageSize) {
                (onPageSizeChange ?? iSetPageSize)(next.pageSize);
                (onPageIndexChange ?? iSetPageIndex)(0);
            } else if ("pageIndex" in next && next.pageIndex !== current.pageIndex) {
                // Only pageIndex changed
                (onPageIndexChange ?? iSetPageIndex)(next.pageIndex);
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
                        className="w-60"
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
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((hg) => (
                                <TableRow key={hg.id}>
                                    {hg.headers.map((header) => (
                                        <TableHead
                                            key={header.id}
                                            className="text-center relative group/th"
                                            style={{
                                                width: header.getSize(),
                                            }}
                                        >
                                            <div className="flex items-center justify-center truncate px-2">
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                          header.column.columnDef.header,
                                                          header.getContext()
                                                      )}
                                            </div>
                                            {header.column.getCanResize() && (
                                                <DataTableResizer header={header} />
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
                                        onClick={() => onRowClick?.(row.original)}
                                        className={onRowClick ? "cursor-pointer" : undefined}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                className="text-center"
                                                style={{
                                                    width: cell.column.getSize(),
                                                }}
                                            >
                                                <div
                                                    className="truncate px-2"
                                                    title={String(cell.getValue() ?? "")}
                                                >
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )}
                                                </div>
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
