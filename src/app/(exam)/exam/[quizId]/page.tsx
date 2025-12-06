import { serverTRPC } from "@/server/trpc/server";
import ExamHeader from "@/components/exam/exam-header";
import QuizProvider from "@/components/exam/context/quiz-context";
import QuizPageClient from "@/components/exam/quiz-page-client";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Props = {
    params: Promise<{
        quizId: string;
    }>;
};

export default async function Page({ params }: Props) {
    const caller = await serverTRPC();
    try {
        const { quizId } = await params;
        // Fetch questions, quiz info and profile in parallel via tRPC
        const [questionsResp, quizInfo, profile, sections] = await Promise.all([
            caller.exam.getStudentQuestions({ quizId }),
            caller.studentQuiz.getById({ quizId }),
            caller.user.getMyProfile(),
            caller.exam.getSections({ quizId }),
        ]);

        const questions = questionsResp.questions || [];

        const quizName = quizInfo?.name || "Quiz";
        const course =
            Array.isArray(quizInfo?.courses) && quizInfo.courses.length > 0
                ? quizInfo.courses[0]
                : null;

        return (
            <div>
                <ExamHeader
                    quizName={quizName}
                    courseCode={course?.code}
                    courseName={course?.name}
                    userName={profile?.name}
                    profileId={profile?.profileId}
                    profileImage={profile?.profileImage}
                />

                <QuizProvider
                    quizId={quizId}
                    quizQuestions={questions}
                    quizInfo={quizInfo}
                    profile={profile}
                    sections={sections}
                >
                    <main className="p-4">
                        <QuizPageClient />
                    </main>
                </QuizProvider>
            </div>
        );
    } catch (error) {
        const errorMessage = (error as Error).message || String(error);

        if (
            errorMessage.includes("Cannot access questions for a submitted quiz") ||
            errorMessage.includes("Cannot access sections for a submitted quiz") ||
            errorMessage.includes("Quiz already submitted")
        ) {
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
                    <div className="flex flex-col items-center gap-6 max-w-md p-6 text-center">
                        <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
                            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-500" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight">
                                Quiz Submitted Successfully!
                            </h2>
                            <p className="text-muted-foreground">
                                Your answers have been recorded. You can now return to your Quizzes.
                            </p>
                        </div>
                        <Link href="/student/quiz">
                            <Button>Go to Quizzes</Button>
                        </Link>
                    </div>
                </div>
            );
        }

        return <div className="p-4">Error loading quiz: {errorMessage}</div>;
    }
}
