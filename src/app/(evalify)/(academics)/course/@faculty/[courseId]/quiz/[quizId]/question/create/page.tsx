"use client";

import { useRouter, useParams } from "next/navigation";
import AuthGuard from "@/components/auth/auth-guard";
import { UserType } from "@/lib/auth/utils";
import QuestionForm from "@/components/question/create-edit/question-form";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import { Question } from "@/types/questions";

export default function CreateQuizQuestionPage() {
    const router = useRouter();
    const { success, error } = useToast();
    const { track } = useAnalytics();
    const params = useParams<{ courseId: string; quizId: string }>();
    const courseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;
    const quizId = Array.isArray(params.quizId) ? params.quizId[0] : params.quizId;

    const createMutation = trpc.question.createForQuiz.useMutation({
        onSuccess: () => {
            success("Question created successfully!");
            router.push(`/course/${courseId}/quiz/${quizId}/view`);
        },
        onError: (err) => {
            error(err.message || "Failed to create question");
        },
    });

    const handleSave = (question: Question) => {
        track("quiz_question_created", {
            questionType: question.type,
            quizId,
            courseId,
        });

        if (question.type === "MCQ" || question.type === "MMCQ") {
            const mcqQuestion = question as Question & {
                questionData: { options: import("@/types/questions").QuestionOption[] };
                solution: { correctOptions: { id: string; isCorrect: boolean }[] };
            };

            createMutation.mutate({
                quizId,
                courseId,
                type: question.type,
                question: question.question,
                marks: question.marks,
                negativeMarks: question.negativeMarks,
                difficulty: question.difficulty,
                bloomTaxonomyLevel: question.bloomsLevel,
                courseOutcome: question.courseOutcome,
                topicIds: (question.topics || []).map((t) => t.topicId),
                questionData: mcqQuestion.questionData,
                solution: mcqQuestion.solution,
            });
        } else if (question.type === "TRUE_FALSE") {
            const tfQuestion = question as Question & {
                trueFalseAnswer: boolean;
            };

            createMutation.mutate({
                quizId,
                courseId,
                type: question.type,
                question: question.question,
                explanation: question.explanation,
                marks: question.marks,
                negativeMarks: question.negativeMarks,
                difficulty: question.difficulty,
                bloomTaxonomyLevel: question.bloomsLevel,
                courseOutcome: question.courseOutcome,
                topicIds: (question.topics || []).map((t) => t.topicId),
                trueFalseAnswer: tfQuestion.trueFalseAnswer,
            });
        } else if (question.type === "FILL_THE_BLANK") {
            const fibQuestion = question as Question & {
                blankConfig: import("@/types/questions").FillInBlanksConfig;
            };

            createMutation.mutate({
                quizId,
                courseId,
                type: question.type,
                question: question.question,
                explanation: question.explanation,
                marks: question.marks,
                negativeMarks: question.negativeMarks,
                difficulty: question.difficulty,
                bloomTaxonomyLevel: question.bloomsLevel,
                courseOutcome: question.courseOutcome,
                topicIds: (question.topics || []).map((t) => t.topicId),
                blankConfig: fibQuestion.blankConfig,
            });
        } else if (question.type === "DESCRIPTIVE") {
            const descQuestion = question as Question & {
                descriptiveConfig: import("@/types/questions").DescriptiveConfig;
            };

            createMutation.mutate({
                quizId,
                courseId,
                type: question.type,
                question: question.question,
                explanation: question.explanation,
                marks: question.marks,
                negativeMarks: question.negativeMarks,
                difficulty: question.difficulty,
                bloomTaxonomyLevel: question.bloomsLevel,
                courseOutcome: question.courseOutcome,
                topicIds: (question.topics || []).map((t) => t.topicId),
                descriptiveConfig: descQuestion.descriptiveConfig,
            });
        } else if (question.type === "MATCHING") {
            const matchQuestion = question as Question & {
                options: import("@/types/questions").MatchOptions[];
            };

            createMutation.mutate({
                quizId,
                courseId,
                type: question.type,
                question: question.question,
                explanation: question.explanation,
                marks: question.marks,
                negativeMarks: question.negativeMarks,
                difficulty: question.difficulty,
                bloomTaxonomyLevel: question.bloomsLevel,
                courseOutcome: question.courseOutcome,
                topicIds: (question.topics || []).map((t) => t.topicId),
                options: matchQuestion.options,
            });
        }
    };

    const handleCancel = () => {
        router.push(`/course/${courseId}/quiz/${quizId}/view`);
    };

    return (
        <AuthGuard requiredGroups={[UserType.MANAGER, UserType.STAFF]}>
            <QuestionForm
                onSave={handleSave}
                onCancel={handleCancel}
                isLoading={createMutation.isPending}
                context="quiz"
            />
        </AuthGuard>
    );
}
