"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { AlertCircle, BookOpen, Search, Play, Clock, CheckCircle2, XCircle } from "lucide-react";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import VirtualizedQuizList from "@/components/quiz/virtualized-quiz-list";
import { Badge } from "@/components/ui/badge";

type QuizStatus = "active" | "completed" | "missed" | "upcoming";
type TabStatus = QuizStatus | "all";

export default function QuizPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const statusParam = searchParams.get("status") as TabStatus | null;
    const initialStatus: TabStatus =
        statusParam && ["all", "active", "upcoming", "completed", "missed"].includes(statusParam)
            ? statusParam
            : "all";

    const [activeTab, setActiveTab] = useState<TabStatus>(initialStatus);
    const [searchTerm, setSearchTerm] = useState("");

    // Update URL when tab changes
    useEffect(() => {
        const params = new URLSearchParams();
        if (activeTab !== "all") {
            params.set("status", activeTab);
        }
        const newUrl = params.toString()
            ? `${window.location.pathname}?${params.toString()}`
            : "/student/quiz";
        router.replace(newUrl, { scroll: false });
    }, [activeTab, router]);

    // Fetch all quizzes for the student
    const {
        data: quizData,
        isLoading,
        error,
    } = trpc.studentQuiz.listAll.useQuery({
        status: "all", // Fetch all and filter on frontend for better UX
        searchTerm,
    });

    // Filter quizzes by active tab
    const filteredQuizzes = useMemo(() => {
        if (!quizData?.quizzes) return [];
        if (activeTab === "all") return quizData.quizzes;
        return quizData.quizzes.filter((quiz) => quiz.status === activeTab);
    }, [quizData, activeTab]);

    // Calculate counts for each tab
    const counts = useMemo(() => {
        if (!quizData?.quizzes) {
            return { all: 0, active: 0, upcoming: 0, completed: 0, missed: 0 };
        }

        const quizzes = quizData.quizzes;
        const activeCount = quizzes.filter((q) => q.status === "active").length;
        const upcomingCount = quizzes.filter((q) => q.status === "upcoming").length;
        const completedCount = quizzes.filter((q) => q.status === "completed").length;
        const missedCount = quizzes.filter((q) => q.status === "missed").length;

        return {
            all: quizzes.length,
            active: activeCount,
            upcoming: upcomingCount,
            completed: completedCount,
            missed: missedCount,
        };
    }, [quizData]);

    if (error) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        Failed to load your quizzes. Please try again later.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-6 w-96" />
                </div>
                <Skeleton className="h-10 w-full max-w-md" />
                <Skeleton className="h-12 w-full" />
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-80" />
                    ))}
                </div>
            </div>
        );
    }

    const allQuizzes = quizData?.quizzes || [];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">My Quizzes</h1>
                <p className="text-muted-foreground">
                    View and access all your quizzes across all courses
                </p>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search quizzes by name, course..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Empty State */}
            {allQuizzes.length === 0 && !searchTerm ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <BookOpen />
                        </EmptyMedia>
                        <EmptyTitle>No Quizzes Found</EmptyTitle>
                        <EmptyDescription>
                            {
                                "You don't have any quizzes assigned yet. Check back later or contact your instructor."
                            }
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabStatus)}>
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="all" className="gap-2">
                            <BookOpen className="size-4" />
                            <span className="hidden sm:inline">All</span>
                            <Badge variant="secondary" className="ml-1">
                                {counts.all}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="active" className="gap-2">
                            <Play className="size-4" />
                            <span className="hidden sm:inline">Active</span>
                            {counts.active > 0 && (
                                <Badge variant="secondary" className="ml-1">
                                    {counts.active}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="upcoming" className="gap-2">
                            <Clock className="size-4" />
                            <span className="hidden sm:inline">Upcoming</span>
                            {counts.upcoming > 0 && (
                                <Badge variant="secondary" className="ml-1">
                                    {counts.upcoming}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="gap-2">
                            <CheckCircle2 className="size-4" />
                            <span className="hidden sm:inline">Completed</span>
                            {counts.completed > 0 && (
                                <Badge variant="secondary" className="ml-1">
                                    {counts.completed}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="missed" className="gap-2">
                            <XCircle className="size-4" />
                            <span className="hidden sm:inline">Missed</span>
                            {counts.missed > 0 && (
                                <Badge variant="secondary" className="ml-1">
                                    {counts.missed}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="mt-6">
                        <VirtualizedQuizList quizzes={filteredQuizzes} />
                    </TabsContent>
                    <TabsContent value="active" className="mt-6">
                        <VirtualizedQuizList quizzes={filteredQuizzes} />
                    </TabsContent>
                    <TabsContent value="upcoming" className="mt-6">
                        <VirtualizedQuizList quizzes={filteredQuizzes} />
                    </TabsContent>
                    <TabsContent value="completed" className="mt-6">
                        <VirtualizedQuizList quizzes={filteredQuizzes} />
                    </TabsContent>
                    <TabsContent value="missed" className="mt-6">
                        <VirtualizedQuizList quizzes={filteredQuizzes} />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
