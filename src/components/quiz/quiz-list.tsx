"use client";

import { useState, useMemo, JSX } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    LayoutGrid,
    List,
    Edit,
    ClipboardList,
    Calendar,
    Clock,
    Users,
    Filter,
    BarChart3,
    Lock,
    CheckCircle2,
    XCircle,
    MonitorPlay,
    Shuffle,
    Calculator,
    EyeOff,
    Timer,
    MoreVertical,
    Trash2,
    Copy,
} from "lucide-react";
import { format, isPast, isFuture, isWithinInterval } from "date-fns";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";
import { DeleteQuizDialog } from "@/components/quiz/delete-quiz-dialog";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";

export interface Quiz {
    id: string;
    name: string;
    description?: string | null;
    instructions?: string | null;
    startTime: Date;
    endTime: Date;
    duration: string;
    password?: string | null;
    fullScreen: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    linearQuiz: boolean;
    calculator: boolean;
    autoSubmit: boolean;
    publishResult: boolean;
    publishQuiz: boolean;
    kioskMode?: boolean | null;
    createdAt: Date;
    updatedAt?: Date | null;
    createdById?: string | null;
    questionCount?: number;
    submissionCount?: number;
    averageScore?: number;
}

interface QuizListProps {
    quizzes: Quiz[];
    courseId?: string;
    onEdit?: (quizId: string) => void;
    onManageQuestions?: (quizId: string) => void;
    onViewResults?: (quizId: string) => void;
    onDelete?: (quizId: string) => void;
    isLoading?: boolean;
}

type ViewMode = "grid" | "list";
type FilterStatus = "all" | "upcoming" | "active" | "completed" | "published" | "unpublished";

export default function QuizList({
    quizzes,
    courseId,
    onEdit,
    onManageQuestions,
    onViewResults,
    onDelete,
    isLoading = false,
}: QuizListProps) {
    const router = useRouter();
    const { success, error } = useToast();
    const { track } = useAnalytics();
    const utils = trpc.useUtils();
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);

    // Get quiz status
    const getQuizStatus = (quiz: Quiz) => {
        const now = new Date();
        const start = new Date(quiz.startTime);
        const end = new Date(quiz.endTime);

        if (isPast(end)) return "completed";
        if (isWithinInterval(now, { start, end })) return "active";
        if (isFuture(start)) return "upcoming";
        return "completed";
    };

    // Filter and search quizzes
    const filteredQuizzes = useMemo(() => {
        return quizzes.filter((quiz) => {
            // Search filter
            const matchesSearch =
                !searchTerm ||
                quiz.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                quiz.description?.toLowerCase().includes(searchTerm.toLowerCase());

            // Status filter
            const status = getQuizStatus(quiz);
            const matchesStatus =
                filterStatus === "all" ||
                (filterStatus === "published" && quiz.publishQuiz) ||
                (filterStatus === "unpublished" && !quiz.publishQuiz) ||
                filterStatus === status;

            return matchesSearch && matchesStatus;
        });
    }, [quizzes, searchTerm, filterStatus]);

    // Delete quiz mutation
    const deleteQuizMutation = trpc.facultyQuiz.delete.useMutation({
        onSuccess: (_, variables) => {
            success("Quiz deleted successfully!");
            setDeleteDialogOpen(false);
            setQuizToDelete(null);
            if (courseId) {
                utils.facultyQuiz.listByCourse.invalidate({ courseId });
            }
            track("quiz_deleted", { quizId: variables.quizId, courseId: variables.courseId });
        },
        onError: (err) => {
            error(err.message || "Failed to delete quiz");
        },
    });

    // Handle actions
    const handleEdit = (quizId: string) => {
        if (onEdit) {
            onEdit(quizId);
        } else if (courseId) {
            router.push(`/course/${courseId}/quiz/${quizId}/manage`);
        }
    };

    const handleManageQuestions = (quizId: string) => {
        if (onManageQuestions) {
            onManageQuestions(quizId);
        } else if (courseId) {
            router.push(`/course/${courseId}/quiz/${quizId}/view`);
        }
    };

    const handleViewResults = (quizId: string) => {
        if (onViewResults) {
            onViewResults(quizId);
        } else if (courseId) {
            router.push(`/course/${courseId}/quiz/${quizId}/results`);
        }
    };

    const handleDeleteClick = (quiz: Quiz) => {
        setQuizToDelete(quiz);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (quizToDelete && courseId) {
            deleteQuizMutation.mutate({
                quizId: quizToDelete.id,
                courseId,
            });
        } else if (quizToDelete && onDelete) {
            onDelete(quizToDelete.id);
            setDeleteDialogOpen(false);
            setQuizToDelete(null);
        }
    };

    const handleDuplicate = (_quizId: string) => {
        // TODO: Implement duplication later
        // Placeholder - duplication feature not yet implemented
    };

    // Get status badge
    const getStatusBadge = (quiz: Quiz) => {
        const status = getQuizStatus(quiz);
        const variants: Record<
            string,
            {
                variant: "default" | "secondary" | "destructive" | "outline";
                label: string;
                icon: typeof CheckCircle2;
                className?: string;
            }
        > = {
            upcoming: {
                variant: "secondary",
                label: "Upcoming",
                icon: Clock,
                className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
            },
            active: {
                variant: "default",
                label: "Active",
                icon: CheckCircle2,
                className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            },
            completed: {
                variant: "outline",
                label: "Completed",
                icon: XCircle,
                className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
            },
        };

        const config = variants[status];
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className={cn("gap-1", config.className)}>
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-10 bg-muted animate-pulse rounded-md" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Search and Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search quizzes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <div className="flex items-center gap-2">
                    {/* Status Filter */}
                    <Select
                        value={filterStatus}
                        onValueChange={(value) => setFilterStatus(value as FilterStatus)}
                    >
                        <SelectTrigger className="w-40">
                            <Filter className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Filter status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Quizzes</SelectItem>
                            <SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="unpublished">Unpublished</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 rounded-md border p-1">
                        <Button
                            variant={viewMode === "grid" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("grid")}
                            className="h-8 w-8 p-0"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "list" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("list")}
                            className="h-8 w-8 p-0"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
                Showing {filteredQuizzes.length} of {quizzes.length} quizzes
            </div>

            {/* Quiz List/Grid */}
            {filteredQuizzes.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Search />
                        </EmptyMedia>
                        <EmptyTitle>No quizzes found</EmptyTitle>
                        <EmptyDescription>
                            {"Try adjusting your search or filter to find what you're looking for."}
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div
                    className={cn(
                        "gap-4",
                        viewMode === "grid"
                            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                            : "flex flex-col"
                    )}
                >
                    {filteredQuizzes.map((quiz) => (
                        <QuizCard
                            key={quiz.id}
                            quiz={quiz}
                            viewMode={viewMode}
                            onEdit={handleEdit}
                            onManageQuestions={handleManageQuestions}
                            onViewResults={handleViewResults}
                            onDelete={handleDeleteClick}
                            onDuplicate={handleDuplicate}
                            getStatusBadge={getStatusBadge}
                        />
                    ))}
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {quizToDelete && (
                <DeleteQuizDialog
                    isOpen={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    quizName={quizToDelete.name}
                    onConfirm={handleDeleteConfirm}
                    isDeleting={deleteQuizMutation.isPending}
                />
            )}
        </div>
    );
}

// Quiz Card Component
interface QuizCardProps {
    quiz: Quiz;
    viewMode: ViewMode;
    onEdit: (quizId: string) => void;
    onManageQuestions: (quizId: string) => void;
    onViewResults: (quizId: string) => void;
    onDelete: (quiz: Quiz) => void;
    onDuplicate: (quizId: string) => void;
    getStatusBadge: (quiz: Quiz) => JSX.Element;
}

function QuizCard({
    quiz,
    viewMode,
    onEdit,
    onManageQuestions,
    onViewResults,
    onDelete,
    onDuplicate,
    getStatusBadge,
}: QuizCardProps) {
    if (viewMode === "list") {
        return (
            <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-semibold text-lg">{quiz.name}</h3>
                                        {getStatusBadge(quiz)}
                                        {!quiz.publishQuiz && (
                                            <Badge
                                                variant="outline"
                                                className="gap-1 bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
                                            >
                                                <EyeOff className="h-3 w-3" />
                                                Draft
                                            </Badge>
                                        )}
                                        {quiz.publishResult && (
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <Badge
                                                        variant="outline"
                                                        className="gap-1 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
                                                    >
                                                        <BarChart3 className="h-3 w-3" />
                                                        Results
                                                    </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>Results Published</TooltipContent>
                                            </Tooltip>
                                        )}
                                        {quiz.password && (
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <Badge
                                                        variant="outline"
                                                        className="gap-1 bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                                                    >
                                                        <Lock className="h-3 w-3" />
                                                        Protected
                                                    </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>Password Protected</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                    {quiz.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {quiz.description}
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onEdit(quiz.id)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onViewResults(quiz.id)}>
                                            <BarChart3 className="mr-2 h-4 w-4" />
                                            Results
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => onDelete(quiz)}
                                            className="text-destructive focus:text-destructive"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => onDuplicate(quiz.id)}
                                            disabled
                                        >
                                            <Copy className="mr-2 h-4 w-4" />
                                            Duplicate
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Quiz Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                                    <span>{format(new Date(quiz.startTime), "MMM dd, yyyy")}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="h-4 w-4 text-green-500 dark:text-green-400" />
                                    <span>
                                        {format(new Date(quiz.startTime), "hh:mm a")} -{" "}
                                        {format(new Date(quiz.endTime), "hh:mm a")}
                                    </span>
                                </div>
                                {quiz.questionCount !== undefined && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <ClipboardList className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                                        <span>{quiz.questionCount} Questions</span>
                                    </div>
                                )}
                                {quiz.submissionCount !== undefined && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Users className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                                        <span>{quiz.submissionCount} Submissions</span>
                                    </div>
                                )}
                            </div>

                            {/* Additional Quiz Settings */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {quiz.fullScreen && (
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <MonitorPlay className="h-3 w-3" />
                                                <span>Fullscreen</span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>Requires Fullscreen Mode</TooltipContent>
                                    </Tooltip>
                                )}
                                {quiz.shuffleQuestions && (
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Shuffle className="h-3 w-3" />
                                                <span>Shuffled</span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>Questions Shuffled</TooltipContent>
                                    </Tooltip>
                                )}
                                {quiz.calculator && (
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Calculator className="h-3 w-3" />
                                                <span>Calculator</span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>Calculator Allowed</TooltipContent>
                                    </Tooltip>
                                )}
                                {quiz.autoSubmit && (
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Timer className="h-3 w-3" />
                                                <span>Auto-submit</span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>Auto Submit on Time End</TooltipContent>
                                    </Tooltip>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Grid View
    return (
        <Card className="hover:shadow-md transition-shadow flex flex-col h-full">
            <CardHeader>
                <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-lg line-clamp-2">{quiz.name}</CardTitle>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onEdit(quiz.id)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onViewResults(quiz.id)}>
                                        <BarChart3 className="mr-2 h-4 w-4" />
                                        Results
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => onDelete(quiz)}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onDuplicate(quiz.id)} disabled>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Duplicate
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {getStatusBadge(quiz)}
                            {!quiz.publishQuiz && (
                                <Badge
                                    variant="outline"
                                    className="gap-1 bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
                                >
                                    <EyeOff className="h-3 w-3" />
                                    Draft
                                </Badge>
                            )}
                            {quiz.publishResult && (
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Badge
                                            variant="outline"
                                            className="gap-1 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
                                        >
                                            <BarChart3 className="h-3 w-3" />
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Results Published</TooltipContent>
                                </Tooltip>
                            )}
                            {quiz.password && (
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Badge
                                            variant="outline"
                                            className="gap-1 bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                                        >
                                            <Lock className="h-3 w-3" />
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Password Protected</TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                </div>
                {quiz.description && (
                    <CardDescription className="line-clamp-2">{quiz.description}</CardDescription>
                )}
            </CardHeader>

            <CardContent className="flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" />
                        <span>{format(new Date(quiz.startTime), "MMM dd, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 shrink-0 text-green-500 dark:text-green-400" />
                        <span>
                            {format(new Date(quiz.startTime), "hh:mm a")} -{" "}
                            {format(new Date(quiz.endTime), "hh:mm a")}
                        </span>
                    </div>
                    {quiz.questionCount !== undefined && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <ClipboardList className="h-4 w-4 shrink-0 text-purple-500 dark:text-purple-400" />
                            <span>{quiz.questionCount} Questions</span>
                        </div>
                    )}
                    {quiz.submissionCount !== undefined && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4 shrink-0 text-orange-500 dark:text-orange-400" />
                            <span>{quiz.submissionCount} Submissions</span>
                        </div>
                    )}

                    {/* Quiz Features */}
                    <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
                        {quiz.fullScreen && (
                            <Tooltip>
                                <TooltipTrigger>
                                    <MonitorPlay className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>Fullscreen</TooltipContent>
                            </Tooltip>
                        )}
                        {quiz.shuffleQuestions && (
                            <Tooltip>
                                <TooltipTrigger>
                                    <Shuffle className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>Shuffled</TooltipContent>
                            </Tooltip>
                        )}
                        {quiz.calculator && (
                            <Tooltip>
                                <TooltipTrigger>
                                    <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>Calculator</TooltipContent>
                            </Tooltip>
                        )}
                        {quiz.autoSubmit && (
                            <Tooltip>
                                <TooltipTrigger>
                                    <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>Auto-submit</TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(quiz.id)}
                        className="w-full"
                    >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onManageQuestions(quiz.id)}
                        >
                            <ClipboardList className="mr-2 h-4 w-4" />
                            Questions
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onViewResults(quiz.id)}>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Results
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
