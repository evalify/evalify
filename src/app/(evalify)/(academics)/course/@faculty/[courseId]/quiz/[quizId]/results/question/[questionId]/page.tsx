"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useAnalytics } from "@/hooks/use-analytics";
import { QuestionResultView } from "@/components/quiz/question-based-result-view";

export default function QuestionResultPage() {
    const params = useParams<{
        courseId: string;
        quizId: string;
        questionId: string;
    }>();
    const { track } = useAnalytics();

    const courseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;
    const quizId = Array.isArray(params.quizId) ? params.quizId[0] : params.quizId;
    const questionId = Array.isArray(params.questionId) ? params.questionId[0] : params.questionId;

    useEffect(() => {
        track("question_result_page_viewed", { quizId, questionId, courseId });
    }, [track, quizId, questionId, courseId]);

    return (
        <div className="container mx-auto px-4 py-6">
            <QuestionResultView quizId={quizId} courseId={courseId} questionId={questionId} />
        </div>
    );
}
