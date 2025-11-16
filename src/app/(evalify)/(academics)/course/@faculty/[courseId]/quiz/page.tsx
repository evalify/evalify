"use client";

import { use } from "react";
import QuizList from "@/components/quiz/quiz-list";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, GraduationCap, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
    params: Promise<{
        courseId: string;
    }>;
};

export default function QuizPage({ params }: Props) {
    const router = useRouter();
    const { courseId } = use(params);

    // Fetch course info
    const { data: courseInfo } = trpc.facultyQuiz.getCourseInfo.useQuery({
        courseId,
    });

    // Fetch quizzes
    const { data: quizData, isLoading: isQuizzesLoading } = trpc.facultyQuiz.listByCourse.useQuery({
        courseId,
        status: "ALL",
        publishStatus: "ALL",
    });

    const handleCreateQuiz = () => {
        router.push(`/course/${courseId}/quiz/create/manage`);
    };

    if (!courseInfo) {
        return (
            <div className="p-6">
                <Card className="border-destructive">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            <p>Failed to load course information</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Simple Header */}
            {courseInfo && (
                <div className="space-y-6">
                    {/* Course Info */}
                    <div className="flex items-center gap-3 pb-4 border-b">
                        <div className="p-2.5 rounded-lg bg-primary/10">
                            <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h1 className="text-2xl font-bold">{courseInfo.name}</h1>
                                <Badge variant="secondary" className="font-mono">
                                    {courseInfo.code}
                                </Badge>
                            </div>
                            {courseInfo.description && (
                                <p className="text-sm text-muted-foreground">
                                    {courseInfo.description}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Quiz Management Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                                <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold">Quizzes</h2>
                                <p className="text-sm text-muted-foreground">
                                    Manage all course quizzes
                                </p>
                            </div>
                        </div>
                        <Button onClick={handleCreateQuiz} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Quiz
                        </Button>
                    </div>
                </div>
            )}

            {/* Quiz List */}
            <QuizList
                quizzes={quizData?.quizzes || []}
                courseId={courseId}
                isLoading={isQuizzesLoading}
            />
        </div>
    );
}
