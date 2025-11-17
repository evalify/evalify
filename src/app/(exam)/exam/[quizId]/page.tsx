import { serverTRPC } from "@/server/trpc/server";
import ExamHeader from "@/components/exam/exam-header";
import QuizProvider from "@/components/exam/context/quiz-context";
import QuizPageClient from "@/components/exam/quiz-page-client";

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
        return (
            <div className="p-4">
                Error loading quiz: {(error as Error).message || String(error)}
            </div>
        );
    }
}
