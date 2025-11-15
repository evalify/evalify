"use client";

import { QuizCreationTabs } from "@/components/quiz/quiz-creation/quiz-creation-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function ManageQuizPage() {
    const params = useParams();
    const courseId = params.courseId as string;
    const quizId = params.quizId as string;

    const isCreateMode = quizId === "create";

    // Fetch quiz data if in edit mode
    const {
        data: quizData,
        isLoading,
        error,
    } = trpc.facultyQuiz.getById.useQuery(
        { quizId },
        {
            enabled: !isCreateMode,
            retry: 1,
        }
    );

    // Show loading state for edit mode
    if (!isCreateMode && isLoading) {
        return (
            <div className="container mx-auto px-4 py-6 space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-[600px] w-full" />
            </div>
        );
    }

    // Show error state for edit mode
    if (!isCreateMode && error) {
        return (
            <div className="container mx-auto px-4 py-6">
                <Card className="border-destructive">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            <div>
                                <p className="font-semibold">Error loading quiz</p>
                                <p className="text-sm">{error.message}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <QuizCreationTabs
            courseId={courseId}
            quizId={isCreateMode ? undefined : quizId}
            existingQuiz={isCreateMode ? undefined : quizData}
        />
    );
}
