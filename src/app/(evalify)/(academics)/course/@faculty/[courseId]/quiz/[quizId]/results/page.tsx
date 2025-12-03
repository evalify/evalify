"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Calendar, Clock, Edit2, Users, HelpCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useAnalytics } from "@/hooks/use-analytics";
import { QuizResultsTable } from "@/components/quiz/quiz-results-table";
import { QuizQuestionsView } from "@/components/quiz/quiz-questions-view";

export default function QuizResultPage() {
    const params = useParams<{ courseId: string; quizId: string }>();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { track } = useAnalytics();
    const courseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;
    const quizId = Array.isArray(params.quizId) ? params.quizId[0] : params.quizId;

    // Get tab from URL or default to "students"
    const currentTab = searchParams.get("tab") ?? "students";

    const handleTabChange = useCallback(
        (value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("tab", value);
            router.push(`?${params.toString()}`, { scroll: false });
        },
        [router, searchParams]
    );

    useEffect(() => {
        track("quiz_results_page_viewed", { quizId, courseId });
    }, [track, quizId, courseId]);

    const { data: quizData, isLoading: quizLoading } = trpc.facultyQuiz.getById.useQuery({
        quizId,
    });

    const { data: stats } = trpc.facultyQuiz.getResultsStats.useQuery({ quizId });

    return (
        <div className="container mx-auto px-4 py-6 space-y-6">
            {quizLoading ? (
                <Card>
                    <CardContent className="p-6">
                        <Skeleton className="h-8 w-1/3 mb-4" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <Skeleton key={i} className="h-24" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ) : quizData ? (
                <Card className="overflow-hidden border-2">
                    <div className="bg-linear-to-r from-primary/10 via-primary/5 to-background px-6 py-4 border-b">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
                                    <FileText className="h-6 w-6 text-primary" />
                                    {quizData.name}
                                </h2>
                                {quizData.description && (
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {quizData.description}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-row gap-2">
                                <Button
                                    onClick={() =>
                                        router.push(`/course/${courseId}/quiz/${quizId}/view`)
                                    }
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-2"
                                >
                                    <FileText className="h-4 w-4" />
                                    Questions
                                </Button>
                                <Button
                                    onClick={() =>
                                        router.push(`/course/${courseId}/quiz/${quizId}/manage`)
                                    }
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-2"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    Edit
                                </Button>
                            </div>
                        </div>
                    </div>

                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="relative overflow-hidden rounded-lg border bg-card p-4 hover:shadow-md transition-shadow">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-10 -mt-10" />
                                <div className="relative flex items-start gap-3">
                                    <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                                        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                            Start Time
                                        </p>
                                        <p className="text-sm font-semibold text-foreground">
                                            {format(new Date(quizData.startTime), "MMM dd, yyyy")}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(new Date(quizData.startTime), "p")}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="relative overflow-hidden rounded-lg border bg-card p-4 hover:shadow-md transition-shadow">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -mr-10 -mt-10" />
                                <div className="relative flex items-start gap-3">
                                    <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg shrink-0">
                                        <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                            End Time
                                        </p>
                                        <p className="text-sm font-semibold text-foreground">
                                            {format(new Date(quizData.endTime), "MMM dd, yyyy")}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(new Date(quizData.endTime), "p")}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="relative overflow-hidden rounded-lg border bg-card p-4 hover:shadow-md transition-shadow">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10" />
                                <div className="relative flex items-start gap-3">
                                    <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-lg shrink-0">
                                        <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                            Duration
                                        </p>
                                        <p className="text-sm font-semibold text-foreground">
                                            {quizData.duration}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="relative overflow-hidden rounded-lg border bg-card p-4 hover:shadow-md transition-shadow">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -mr-10 -mt-10" />
                                <div className="relative flex items-start gap-3">
                                    <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg shrink-0">
                                        <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                            Responses
                                        </p>
                                        <p className="text-sm font-semibold text-foreground">
                                            {stats?.submitted ?? 0} / {stats?.total ?? 0}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {(stats?.violated ?? 0) > 0 && (
                                                <span className="text-red-500">
                                                    {stats?.violated} violations
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="students" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Students
                    </TabsTrigger>
                    <TabsTrigger value="questions" className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4" />
                        Questions
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="students" className="mt-6">
                    <QuizResultsTable quizId={quizId} courseId={courseId} />
                </TabsContent>
                <TabsContent value="questions" className="mt-6">
                    <QuizQuestionsView quizId={quizId} courseId={courseId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
