"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { StudentResultView } from "@/components/quiz/student-result-view";
import { useAnalytics } from "@/hooks/use-analytics";

export default function StudentResultPage() {
    const params = useParams<{
        courseId: string;
        quizId: string;
        studentId: string;
    }>();
    const { track } = useAnalytics();

    const courseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;
    const quizId = Array.isArray(params.quizId) ? params.quizId[0] : params.quizId;
    const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;

    useEffect(() => {
        track("student_result_page_viewed", { quizId, studentId, courseId });
    }, [track, quizId, studentId, courseId]);

    return <StudentResultView quizId={quizId} studentId={studentId} />;
}
