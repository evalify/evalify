"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import StudentQuizList from "@/components/quiz/student-quiz-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function Page({ params }: { params: Promise<{ courseId: string }> }) {
    const router = useRouter();
    const { courseId } = use(params);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<"active" | "completed" | "missed" | "all">(
        "all"
    );
    const [currentPage, setCurrentPage] = useState(1);
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    const pageSize = 12;

    const { data, isLoading, error, refetch } = trpc.studentQuiz.listByCourse.useQuery({
        courseId,
        searchTerm,
        status: filterStatus,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
    });

    // Update current time every second
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Find the upcoming quiz with shortest wait time
    const upcomingQuiz = useMemo(() => {
        if (!data?.quizzes) return null;

        const now = currentTime;
        const upcoming = data.quizzes
            .filter((quiz) => {
                const startTime = new Date(quiz.startTime).getTime();
                return startTime > now;
            })
            .sort((a, b) => {
                const aStart = new Date(a.startTime).getTime();
                const bStart = new Date(b.startTime).getTime();
                return aStart - bStart;
            });

        return upcoming[0] || null;
    }, [data, currentTime]);

    // Auto-reload when upcoming quiz is about to start
    useEffect(() => {
        if (!upcomingQuiz) return;

        const startTime = new Date(upcomingQuiz.startTime).getTime();
        const now = Date.now();
        const timeUntilStart = startTime - now;

        // If quiz starts within 2 minutes, check every 5 seconds
        if (timeUntilStart > 0 && timeUntilStart <= 120000) {
            const checkInterval = setInterval(() => {
                const now = Date.now();
                if (now >= startTime) {
                    // Quiz has started, refetch data
                    refetch();
                    clearInterval(checkInterval);

                    // Redirect to instructions page
                    router.push(`/course/${courseId}/quiz/${upcomingQuiz.id}/instruction`);
                }
            }, 5000);

            return () => clearInterval(checkInterval);
        }

        // If quiz starts within 5 minutes, reload data every 30 seconds
        if (timeUntilStart > 0 && timeUntilStart <= 300000) {
            const reloadInterval = setInterval(() => {
                refetch();
            }, 30000);

            return () => clearInterval(reloadInterval);
        }
    }, [upcomingQuiz, refetch, router, courseId]);

    if (error) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        Failed to load quizzes. Please try again later.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Quizzes</h1>
                <p className="text-muted-foreground">View and access all quizzes for this course</p>
            </div>

            <StudentQuizList
                quizzes={data?.quizzes || []}
                total={data?.total || 0}
                isLoading={isLoading}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onSearch={setSearchTerm}
                onFilterStatus={setFilterStatus}
                searchTerm={searchTerm}
                filterStatus={filterStatus}
                courseId={courseId}
            />
        </div>
    );
}
