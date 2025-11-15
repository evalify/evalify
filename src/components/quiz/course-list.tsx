"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Grid3x3, List, Search, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { CourseCard } from "./course-card";

type CourseType = "CORE" | "ELECTIVE" | "MICRO_CREDENTIAL";
type CourseStatus = "ACTIVE" | "INACTIVE";

export interface Course {
    id: string;
    name: string;
    description: string | null;
    code: string;
    image: string | null;
    type: CourseType;
    semesterId: string;
    isActive: CourseStatus;
    createdAt: Date;
    updatedAt: Date | null;
    semesterName: string | null;
    semesterYear: number | null;
}

interface CourseListProps {
    courses: Course[];
    total: number;
    isLoading?: boolean;
    currentPage: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onSearch: (searchTerm: string) => void;
    onFilterType: (type: CourseType | "ALL") => void;
    onFilterStatus: (status: CourseStatus | "ALL") => void;
    searchTerm: string;
    filterType: CourseType | "ALL";
    filterStatus: CourseStatus | "ALL";
    basePath?: string;
}

export default function CourseList({
    courses,
    total,
    isLoading = false,
    currentPage,
    pageSize,
    onPageChange,
    onSearch,
    onFilterType,
    onFilterStatus,
    searchTerm,
    filterType,
    filterStatus,
    basePath = "/course",
}: CourseListProps) {
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [searchInput, setSearchInput] = useState(searchTerm);

    const totalPages = Math.ceil(total / pageSize);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(searchInput);
    };

    const router = useRouter();

    // Color classes for course cards (light+dark friendly gradients)
    const colorClasses = [
        "bg-linear-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white",
        "bg-linear-to-br from-violet-500 to-violet-600 dark:from-violet-600 dark:to-violet-700 text-white",
        "bg-linear-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 text-white",
        "bg-linear-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 text-white",
        "bg-linear-to-br from-rose-500 to-rose-600 dark:from-rose-600 dark:to-rose-700 text-white",
        "bg-linear-to-br from-cyan-500 to-cyan-600 dark:from-cyan-600 dark:to-cyan-700 text-white",
    ];

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-20" />
                </div>
                <div
                    className={cn(
                        "grid gap-4",
                        viewMode === "grid"
                            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                            : "grid-cols-1"
                    )}
                >
                    {Array.from({ length: pageSize }).map((_, i) => (
                        <Skeleton key={i} className="h-48 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters and Controls */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search courses..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button type="submit" variant="outline">
                        Search
                    </Button>
                </form>

                <div className="flex items-center gap-2">
                    <Select
                        value={filterType}
                        onValueChange={(value: string) => onFilterType(value as CourseType | "ALL")}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Types</SelectItem>
                            <SelectItem value="CORE">Core</SelectItem>
                            <SelectItem value="ELECTIVE">Elective</SelectItem>
                            <SelectItem value="MICRO_CREDENTIAL">Micro Credential</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filterStatus}
                        onValueChange={(value: string) =>
                            onFilterStatus(value as CourseStatus | "ALL")
                        }
                    >
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex rounded-md border">
                        <Button
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size="icon-sm"
                            onClick={() => setViewMode("grid")}
                            className="rounded-r-none"
                        >
                            <Grid3x3 className="size-4" />
                        </Button>
                        <Button
                            variant={viewMode === "list" ? "default" : "ghost"}
                            size="icon-sm"
                            onClick={() => setViewMode("list")}
                            className="rounded-l-none"
                        >
                            <List className="size-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
                {`Showing ${courses.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to ${Math.min(currentPage * pageSize, total)} of ${total} courses`}
            </div>

            {/* Course List */}
            {courses.length === 0 ? (
                <Empty title="No courses found" />
            ) : viewMode === "grid" ? (
                // Grid View
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {courses.map((course, index) => (
                        <CourseCard
                            key={course.id}
                            course={course}
                            colorClass={colorClasses[index % colorClasses.length]}
                            basePath={basePath}
                        />
                    ))}
                </div>
            ) : (
                // Table View
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Semester</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {courses.map((course) => (
                                <TableRow
                                    key={course.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => router.push(`${basePath}/${course.id}`)}
                                >
                                    <TableCell className="font-mono font-medium">
                                        {course.code}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium">{course.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                course.type === "CORE" ? "default" : "secondary"
                                            }
                                        >
                                            {course.type === "CORE"
                                                ? "Core"
                                                : course.type === "ELECTIVE"
                                                  ? "Elective"
                                                  : "Micro Credential"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-sm">
                                            <Calendar className="size-3.5 text-muted-foreground" />
                                            <span>
                                                {course.semesterName}
                                                {course.semesterYear && ` (${course.semesterYear})`}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                course.isActive === "ACTIVE" ? "default" : "outline"
                                            }
                                        >
                                            {course.isActive === "ACTIVE" ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`${basePath}/${course.id}/quiz`);
                                            }}
                                        >
                                            View Quiz
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={!hasPrevPage}
                    >
                        <ChevronLeft className="mr-2 size-4" />
                        Previous
                    </Button>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </span>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={!hasNextPage}
                    >
                        Next
                        <ChevronRight className="ml-2 size-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
