"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import AuthGuard from "@/components/auth/auth-guard";
import { UserType } from "@/lib/auth/utils";

export default function QuizQuestionsPage() {
    const params = useParams<{ courseId: string; quizId: string }>();
    const router = useRouter();
    const courseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;
    const quizId = Array.isArray(params.quizId) ? params.quizId[0] : params.quizId;

    const handleAddQuestion = () => {
        router.push(`/course/${courseId}/quiz/${quizId}/question/create`);
    };

    return (
        <AuthGuard requiredGroups={[UserType.MANAGER, UserType.STAFF]}>
            <div className="container mx-auto px-4 py-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">Quiz Questions</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage and organize questions for this quiz
                        </p>
                    </div>
                    <Button onClick={handleAddQuestion} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Question
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Questions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            No questions added yet. Click &quot;Add Question&quot; to create your
                            first question.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </AuthGuard>
    );
}
