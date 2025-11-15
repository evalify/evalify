"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";
import {
    Search,
    Grid3x3,
    List,
    ChevronLeft,
    ChevronRight,
    Clock,
    Calendar,
    Timer,
    CheckCircle2,
    XCircle,
    AlertCircle,
    BookOpen,
    Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";

type QuizStatus = "active" | "completed" | "missed";

export interface StudentQuiz {
    id: string;
    name: string;
    description: string | null;
    instructions: string | null;
    startTime: Date;
    endTime: Date;
    duration: string; // PostgreSQL interval type
    publishQuiz: boolean;
    publishResult: boolean;
    createdAt: Date;
    courseName: string | null;
    courseCode: string | null;
    instructorName: string | null;
    instructorEmail: string | null;
    instructorImage: string | null;
    status: QuizStatus;
}

interface StudentQuizListProps {
    quizzes: StudentQuiz[];
    total: number;
    isLoading?: boolean;
    currentPage: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onSearch: (searchTerm: string) => void;
    onFilterStatus: (status: QuizStatus | "all") => void;
    searchTerm: string;
    filterStatus: QuizStatus | "all";
    courseId: string;
}

// Parse PostgreSQL interval to minutes
function parseIntervalToMinutes(interval: string): number {
    // Expected format: "HH:MM:SS" or "X days HH:MM:SS"
    const parts = interval.split(" ");
    let totalMinutes = 0;

    if (parts.length === 3) {
        // Has days
        totalMinutes += parseInt(parts[0]) * 24 * 60;
        const timeParts = parts[2].split(":");
        totalMinutes += parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
    } else {
        // Just time
        const timeParts = parts[0].split(":");
        totalMinutes += parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
    }

    return totalMinutes;
}

// Format duration to readable string
function formatDuration(durationMinutes: number): string {
    if (durationMinutes < 60) {
        return `${durationMinutes} min`;
    }
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

// Get status configuration
function getStatusConfig(status: QuizStatus) {
    switch (status) {
        case "active":
            return {
                label: "Active",
                icon: Play,
                color: "text-green-600 dark:text-green-400",
                bgColor: "bg-green-100 dark:bg-green-900/30",
                borderColor: "border-green-200 dark:border-green-800",
            };
        case "completed":
            return {
                label: "Completed",
                icon: CheckCircle2,
                color: "text-blue-600 dark:text-blue-400",
                bgColor: "bg-blue-100 dark:bg-blue-900/30",
                borderColor: "border-blue-200 dark:border-blue-800",
            };
        case "missed":
            return {
                label: "Missed",
                icon: XCircle,
                color: "text-red-600 dark:text-red-400",
                bgColor: "bg-red-100 dark:bg-red-900/30",
                borderColor: "border-red-200 dark:border-red-800",
            };
    }
}

// Quiz Card Component
function QuizCard({ quiz, courseId }: { quiz: StudentQuiz; courseId: string }) {
    const router = useRouter();
    const statusConfig = getStatusConfig(quiz.status);
    const StatusIcon = statusConfig.icon;

    const durationMinutes = parseIntervalToMinutes(quiz.duration);
    const startTime = new Date(quiz.startTime);
    const endTime = new Date(quiz.endTime);
    const now = new Date();
    const isUpcoming = isFuture(startTime);
    const isActive = !isPast(endTime) && !isFuture(startTime);

    // Check if instructions are accessible (5 mins before start)
    const fiveMinutesBeforeStart = new Date(startTime.getTime() - 5 * 60 * 1000);
    const canAccessInstructions = now >= fiveMinutesBeforeStart;
    const canViewResults = quiz.status === "completed" && quiz.publishResult;

    const handleViewInstructions = () => {
        router.push(`/course/${courseId}/quiz/${quiz.id}/instruction`);
    };

    const handleViewResults = () => {
        router.push(`/course/${courseId}/quiz/${quiz.id}/results`);
    };

    return (
        <Card
            className={cn(
                "group overflow-hidden transition-all hover:shadow-lg",
                statusConfig.borderColor
            )}
        >
            <CardHeader className={cn("border-b pb-4", statusConfig.bgColor)}>
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                        <CardTitle className="line-clamp-1 text-lg">{quiz.name}</CardTitle>
                        <CardDescription className="line-clamp-2 text-sm">
                            {quiz.description || "No description"}
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className={cn("gap-1", statusConfig.color)}>
                        <StatusIcon className="size-3" />
                        {statusConfig.label}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
                {/* Course Info */}
                <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="size-4 text-muted-foreground" />
                    <span className="font-medium">{quiz.courseCode}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="truncate text-muted-foreground">{quiz.courseName}</span>
                </div>

                {/* Instructor Info */}
                {quiz.instructorName && (
                    <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                            <AvatarImage src={quiz.instructorImage || undefined} />
                            <AvatarFallback className="text-xs">
                                {quiz.instructorName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm text-muted-foreground">
                            {quiz.instructorName}
                        </span>
                    </div>
                )}

                {/* Time Information */}
                <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="size-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Start:</span>
                        <span className="font-medium">{format(startTime, "MMM d, h:mm a")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Clock className="size-4 text-muted-foreground" />
                        <span className="text-muted-foreground">End:</span>
                        <span className="font-medium">{format(endTime, "MMM d, h:mm a")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Timer className="size-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium">{formatDuration(durationMinutes)}</span>
                    </div>
                </div>

                {/* Status Message */}
                {isUpcoming && (
                    <div className="flex items-center gap-2 rounded-md bg-amber-50 p-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                        <AlertCircle className="size-4" />
                        <span>Starts {formatDistanceToNow(startTime, { addSuffix: true })}</span>
                    </div>
                )}
                {isActive && (
                    <div className="flex items-center gap-2 rounded-md bg-green-50 p-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        <Play className="size-4" />
                        <span>
                            Available now · Ends {formatDistanceToNow(endTime, { addSuffix: true })}
                        </span>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                    {canAccessInstructions &&
                        quiz.status !== "completed" &&
                        quiz.status !== "missed" && (
                            <Button
                                onClick={handleViewInstructions}
                                className="flex-1"
                                variant={isActive ? "default" : "outline"}
                            >
                                <Play className="mr-2 size-4" />
                                {isActive ? "Start Quiz" : "View Instructions"}
                            </Button>
                        )}
                    {canViewResults && (
                        <Button onClick={handleViewResults} className="flex-1" variant="secondary">
                            <CheckCircle2 className="mr-2 size-4" />
                            View Results
                        </Button>
                    )}
                    {!canAccessInstructions &&
                        quiz.status !== "completed" &&
                        quiz.status !== "missed" && (
                            <Button disabled className="flex-1" variant="outline">
                                <Clock className="mr-2 size-4" />
                                Available{" "}
                                {formatDistanceToNow(fiveMinutesBeforeStart, { addSuffix: true })}
                            </Button>
                        )}
                </div>
            </CardContent>
        </Card>
    );
}

export default function StudentQuizList({
    quizzes,
    total,
    isLoading = false,
    currentPage,
    pageSize,
    onPageChange,
    onSearch,
    onFilterStatus,
    searchTerm,
    filterStatus,
    courseId,
}: StudentQuizListProps) {
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

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-20" />
                </div>
                <div
                    className={cn(
                        "grid gap-4",
                        viewMode === "grid"
                            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                            : "grid-cols-1"
                    )}
                >
                    {Array.from({ length: pageSize }).map((_, i) => (
                        <Skeleton key={i} className="h-80 w-full" />
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
                            placeholder="Search quizzes..."
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
                        value={filterStatus}
                        onValueChange={(value: string) =>
                            onFilterStatus(value as QuizStatus | "all")
                        }
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="missed">Missed</SelectItem>
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
                {`Showing ${quizzes.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to ${Math.min(currentPage * pageSize, total)} of ${total} quizzes`}
            </div>

            {/* Quiz List */}
            {quizzes.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <BookOpen />
                        </EmptyMedia>
                        <EmptyTitle>No Quizzes Found</EmptyTitle>
                        <EmptyDescription>
                            There are no quizzes available for this course yet. Check back later or
                            contact your instructor.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : viewMode === "grid" ? (
                // Grid View
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {quizzes.map((quiz) => (
                        <QuizCard key={quiz.id} quiz={quiz} courseId={courseId} />
                    ))}
                </div>
            ) : (
                // Table View
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Quiz Name</TableHead>
                                <TableHead>Instructor</TableHead>
                                <TableHead>Start Time</TableHead>
                                <TableHead>End Time</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quizzes.map((quiz) => {
                                const statusConfig = getStatusConfig(quiz.status);
                                const StatusIcon = statusConfig.icon;
                                const durationMinutes = parseIntervalToMinutes(quiz.duration);
                                const startTime = new Date(quiz.startTime);
                                const now = new Date();
                                const fiveMinutesBeforeStart = new Date(
                                    startTime.getTime() - 5 * 60 * 1000
                                );
                                const canAccessInstructions = now >= fiveMinutesBeforeStart;
                                const canViewResults =
                                    quiz.status === "completed" && quiz.publishResult;

                                return (
                                    <TableRow key={quiz.id} className="hover:bg-muted/50">
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="font-medium">{quiz.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {quiz.courseCode} · {quiz.courseName}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {quiz.instructorName && (
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="size-6">
                                                        <AvatarImage
                                                            src={quiz.instructorImage || undefined}
                                                        />
                                                        <AvatarFallback className="text-xs">
                                                            {quiz.instructorName
                                                                .split(" ")
                                                                .map((n) => n[0])
                                                                .join("")
                                                                .toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm">
                                                        {quiz.instructorName}
                                                    </span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {format(new Date(quiz.startTime), "MMM d, h:mm a")}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {format(new Date(quiz.endTime), "MMM d, h:mm a")}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {formatDuration(durationMinutes)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn("gap-1", statusConfig.color)}
                                            >
                                                <StatusIcon className="size-3" />
                                                {statusConfig.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {canAccessInstructions &&
                                                    quiz.status !== "completed" &&
                                                    quiz.status !== "missed" && (
                                                        <Button
                                                            onClick={() =>
                                                                router.push(
                                                                    `/course/${courseId}/quiz/${quiz.id}/instruction`
                                                                )
                                                            }
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            View
                                                        </Button>
                                                    )}
                                                {canViewResults && (
                                                    <Button
                                                        onClick={() =>
                                                            router.push(
                                                                `/course/${courseId}/quiz/${quiz.id}/results`
                                                            )
                                                        }
                                                        size="sm"
                                                        variant="secondary"
                                                    >
                                                        Results
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
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
