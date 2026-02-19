"use client";

import { useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";
import {
    Clock,
    Calendar,
    Timer,
    Play,
    AlertCircle,
    BookOpen,
    GraduationCap,
    Zap,
    Award,
    XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type QuizStatus = "active" | "completed" | "missed" | "upcoming";

export interface VirtualizedQuiz {
    id: string;
    name: string;
    description: string | null;
    instructions: string | null;
    startTime: Date;
    endTime: Date;
    duration: string;
    publishQuiz: boolean;
    publishResult: boolean;
    createdAt: Date;
    courseName: string | null;
    courseCode: string | null;
    courseId: string;
    courses?: Array<{
        id: string;
        name: string | null;
        code: string | null;
    }>;
    instructorName: string | null;
    instructorEmail: string | null;
    instructorImage: string | null;
    status: QuizStatus;
}

interface VirtualizedQuizListProps {
    quizzes: VirtualizedQuiz[];
    estimatedSize?: number;
}

function getStatusConfig(status: QuizStatus) {
    switch (status) {
        case "active":
            return {
                label: "Active Now",
                icon: Zap,
                color: "text-green-600 dark:text-green-400",
                bgColor:
                    "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50",
                borderColor: "border-green-300 dark:border-green-700",
                badgeColor: "bg-green-500 dark:bg-green-600",
            };
        case "upcoming":
            return {
                label: "Upcoming",
                icon: Clock,
                color: "text-blue-600 dark:text-blue-400",
                bgColor:
                    "bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50",
                borderColor: "border-blue-300 dark:border-blue-700",
                badgeColor: "bg-blue-500 dark:bg-blue-600",
            };
        case "completed":
            return {
                label: "Completed",
                icon: Award,
                color: "text-purple-600 dark:text-purple-400",
                bgColor:
                    "bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/50",
                borderColor: "border-purple-300 dark:border-purple-700",
                badgeColor: "bg-purple-500 dark:bg-purple-600",
            };
        case "missed":
            return {
                label: "Missed",
                icon: XCircle,
                color: "text-red-600 dark:text-red-400",
                bgColor:
                    "bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50",
                borderColor: "border-red-300 dark:border-red-700",
                badgeColor: "bg-red-500 dark:bg-red-600",
            };
    }
}

function groupQuizzesByStatus(quizzes: VirtualizedQuiz[]) {
    const grouped: Record<QuizStatus, VirtualizedQuiz[]> = {
        active: [],
        upcoming: [],
        completed: [],
        missed: [],
    };

    quizzes.forEach((quiz) => {
        grouped[quiz.status].push(quiz);
    });

    return grouped;
}

function StatusSection({
    status,
    quizzes,
    onRenderQuiz,
}: {
    status: QuizStatus;
    quizzes: VirtualizedQuiz[];
    onRenderQuiz: (quiz: VirtualizedQuiz, index: number) => React.ReactNode;
}) {
    const statusConfig = getStatusConfig(status);
    const StatusIcon = statusConfig.icon;

    if (quizzes.length === 0) return null;

    return (
        <div className="mb-8">
            <div className="flex items-center gap-3 mb-4 px-4">
                <div className={cn("flex items-center gap-2", statusConfig.color)}>
                    <StatusIcon className="size-5" />
                    <h2 className="text-lg font-semibold">{statusConfig.label}</h2>
                </div>
                <Badge variant="secondary" className="ml-auto">
                    {quizzes.length}
                </Badge>
            </div>
            <div className="space-y-3">
                {quizzes.map((quiz, index) => onRenderQuiz(quiz, index))}
            </div>
        </div>
    );
}

/**
 * Render a quiz card showing title, courses, instructor, schedule, status indicator, and context-sensitive actions.
 *
 * Displays start time, duration, time-until-start or time-until-end when applicable, and action buttons that navigate to the quiz instructions or results pages. Buttons are enabled or shown based on quiz timing (instructions available five minutes before start), status, and the `publishResult` flag.
 *
 * @param quiz - The quiz data used to populate the card. Must include identifiers (`id`, `courseId`), timing (`startTime`, `endTime`, `duration`), `status`, and fields used for display such as `name`, optional `courses`, `courseCode`, `instructorName`, `instructorImage`, and `publishResult`.
 * @returns A JSX element representing the quiz card.
 */
function QuizCard({ quiz }: { quiz: VirtualizedQuiz }) {
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
        router.push(`/course/${quiz.courseId}/quiz/${quiz.id}/instruction`);
    };

    const handleViewResults = () => {
        router.push(`/course/${quiz.courseId}/quiz/${quiz.id}/results`);
    };

    return (
        <Card
            className="group relative overflow-hidden hover:shadow-md transition-all border"
            style={{ backgroundColor: statusConfig.bgColor, borderColor: statusConfig.borderColor }}
        >
            <div className="flex flex-col md:flex-row">
                {/* Main Content - Two Column Layout */}
                <div className="flex-1 p-4 md:p-6">
                    <div className="grid md:grid-cols-[1fr_auto] gap-6">
                        {/* Left Column - Quiz Details */}
                        <div className="space-y-4">
                            {/* Header */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge
                                        variant="outline"
                                        className={cn("gap-1.5 text-sm py-1", statusConfig.color)}
                                    >
                                        <StatusIcon className="size-4" />
                                        {statusConfig.label}
                                    </Badge>
                                    {quiz.courses && quiz.courses.length > 0 ? (
                                        <>
                                            {quiz.courses.slice(0, 2).map((course, idx) => (
                                                <div
                                                    key={course.id || idx}
                                                    className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium"
                                                >
                                                    <GraduationCap className="size-4" />
                                                    {course.name || "N/A"}
                                                    {course.code && (
                                                        <span className="text-xs opacity-70">
                                                            ({course.code})
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                            {quiz.courses.length > 2 && (
                                                <Badge variant="secondary" className="text-sm">
                                                    +{quiz.courses.length - 2} more
                                                </Badge>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                                            <GraduationCap className="size-4" />
                                            <span>{quiz.courseName}</span>
                                            {quiz.courseCode && (
                                                <span className="text-xs opacity-70">
                                                    ({quiz.courseCode})
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-xl font-semibold line-clamp-2">{quiz.name}</h3>
                                {quiz.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {quiz.description}
                                    </p>
                                )}
                            </div>

                            {/* Schedule Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="size-4" />
                                        <span className="text-xs font-medium">Start Time</span>
                                    </div>
                                    <p className="text-sm font-semibold">
                                        {format(startTime, "MMM d, yyyy")}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {format(startTime, "h:mm a")}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Timer className="size-4" />
                                        <span className="text-xs font-medium">Duration</span>
                                    </div>
                                    <p className="text-sm font-semibold">
                                        {formatDuration(durationMinutes)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Ends at {format(endTime, "h:mm a")}
                                    </p>
                                </div>
                            </div>

                            {/* Status Message */}
                            {isUpcoming && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                                    <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                                        Starts {formatDistanceToNow(startTime, { addSuffix: true })}
                                    </span>
                                </div>
                            )}
                            {isActive && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                                    <Zap className="size-4 text-green-600 dark:text-green-400 shrink-0" />
                                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                        Ends {formatDistanceToNow(endTime, { addSuffix: true })}
                                    </span>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2 pt-2">
                                {canAccessInstructions &&
                                    quiz.status !== "completed" &&
                                    quiz.status !== "missed" && (
                                        <Button
                                            onClick={handleViewInstructions}
                                            className="gap-2"
                                            size="default"
                                            variant={isActive ? "default" : "outline"}
                                        >
                                            <Play className="size-4" />
                                            {isActive ? "Start Quiz" : "View Instructions"}
                                        </Button>
                                    )}

                                {canViewResults && (
                                    <Button
                                        onClick={handleViewResults}
                                        variant="secondary"
                                        className="gap-2"
                                        size="default"
                                    >
                                        <Award className="size-4" />
                                        View Results
                                    </Button>
                                )}

                                {!canAccessInstructions &&
                                    quiz.status !== "completed" &&
                                    quiz.status !== "missed" && (
                                        <Button
                                            disabled
                                            variant="outline"
                                            className="gap-2"
                                            size="default"
                                        >
                                            <Clock className="size-4" />
                                            Available{" "}
                                            {formatDistanceToNow(fiveMinutesBeforeStart, {
                                                addSuffix: true,
                                            })}
                                        </Button>
                                    )}
                            </div>
                        </div>

                        {/* Right Column - Instructor Info & Additional Details */}
                        <div className="md:w-64 space-y-4 md:border-l md:pl-6">
                            {/* Instructor Card */}
                            {quiz.instructorName && (
                                <div className="space-y-3">
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Instructor
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Avatar className="size-12 border-2 shrink-0">
                                            <AvatarImage src={quiz.instructorImage || undefined} />
                                            <AvatarFallback className="text-sm font-semibold">
                                                {quiz.instructorName
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")
                                                    .toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm line-clamp-2">
                                                {quiz.instructorName}
                                            </p>
                                            {quiz.instructorEmail && (
                                                <p className="text-xs text-muted-foreground line-clamp-1">
                                                    {quiz.instructorEmail}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Additional Info */}
                            <div className="space-y-3 pt-3 border-t">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Published</span>
                                        <Badge
                                            variant={quiz.publishQuiz ? "default" : "secondary"}
                                            className="text-xs"
                                        >
                                            {quiz.publishQuiz ? "Yes" : "No"}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">
                                            Results Published
                                        </span>
                                        <Badge
                                            variant={quiz.publishResult ? "default" : "secondary"}
                                            className="text-xs"
                                        >
                                            {quiz.publishResult ? "Yes" : "No"}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between text-xs pt-2">
                                        <span className="text-muted-foreground">Created</span>
                                        <span className="text-xs font-medium">
                                            {format(new Date(quiz.createdAt), "MMM d, yyyy")}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}

/**
 * Render a virtualized list of quizzes grouped by status, displaying a section header and quiz cards for each group.
 *
 * @param quizzes - The quizzes to display; items are grouped by their `status` into sections.
 * @param estimatedSize - Estimated height in pixels for each quiz item used by the virtualizer (defaults to 350).
 * @returns The component tree for a scrollable, virtualized list of status sections and quiz cards, or an empty-state message when `quizzes` is empty.
 */
export default function VirtualizedQuizList({
    quizzes,
    estimatedSize = 350,
}: VirtualizedQuizListProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const grouped = useMemo(() => groupQuizzesByStatus(quizzes), [quizzes]);

    // Flatten the grouped quizzes for virtualization
    const flattenedQuizzes = useMemo(() => {
        const sections: Array<
            | {
                  type: "section";
                  status: QuizStatus;
                  quizzes: VirtualizedQuiz[];
              }
            | {
                  type: "quiz";
                  quiz: VirtualizedQuiz;
              }
        > = [];

        const statusOrder: QuizStatus[] = ["active", "upcoming", "completed", "missed"];

        statusOrder.forEach((status) => {
            if (grouped[status].length > 0) {
                sections.push({
                    type: "section",
                    status,
                    quizzes: grouped[status],
                });
                grouped[status].forEach((quiz) => {
                    sections.push({
                        type: "quiz",
                        quiz,
                    });
                });
            }
        });

        return sections;
    }, [grouped]);

    // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual's useVirtualizer is safe to use here
    const rowVirtualizer = useVirtualizer({
        count: flattenedQuizzes.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => {
            const item = flattenedQuizzes[index];
            return item?.type === "section" ? 80 : estimatedSize;
        },
        overscan: 5,
    });

    if (quizzes.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                    <BookOpen className="size-14 mx-auto text-muted-foreground/40" />
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold">No quizzes found</h3>
                        <p className="text-sm text-muted-foreground">
                            There are no quizzes in this category.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={parentRef}
            className="h-[calc(100vh-16rem)] overflow-auto"
            style={{
                contain: "strict",
            }}
        >
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                    const item = flattenedQuizzes[virtualItem.index];

                    if (!item) return null;

                    if (item.type === "section") {
                        return (
                            <div
                                key={`section-${item.status}`}
                                data-index={virtualItem.index}
                                ref={rowVirtualizer.measureElement}
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    transform: `translateY(${virtualItem.start}px)`,
                                }}
                                className="px-4 py-6"
                            >
                                <StatusSection
                                    status={item.status}
                                    quizzes={item.quizzes}
                                    onRenderQuiz={(quiz) => <QuizCard key={quiz.id} quiz={quiz} />}
                                />
                            </div>
                        );
                    }

                    return null;
                })}
            </div>
        </div>
    );
}

function parseIntervalToMinutes(interval: string): number {
    const parts = interval.split(" ");
    let totalMinutes = 0;

    if (parts.length === 3) {
        totalMinutes += parseInt(parts[0]) * 24 * 60;
        const timeParts = parts[2].split(":");
        totalMinutes += parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
    } else {
        const timeParts = parts[0].split(":");
        totalMinutes += parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
    }

    return totalMinutes;
}

function formatDuration(durationMinutes: number): string {
    if (durationMinutes < 60) {
        return `${durationMinutes} min`;
    }
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
