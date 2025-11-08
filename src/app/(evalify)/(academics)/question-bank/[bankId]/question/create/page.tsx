"use client";

import { useRouter, useParams } from "next/navigation";
import AuthGuard from "@/components/auth/auth-guard";
import { UserType } from "@/lib/auth/utils";
import QuestionForm from "@/components/question/create-edit/question-form";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import { Question } from "@/types/questions";

export default function CreateQuestionPage() {
    const router = useRouter();
    const { success, error } = useToast();
    const { track } = useAnalytics();
    const utils = trpc.useUtils();
    const { bankId } = useParams<{ bankId: string }>();

    const createMutation = trpc.question.createForBank.useMutation({
        onSuccess: () => {
            success("Question created successfully!");
            utils.question.listByBank.invalidate({ bankId });
            router.push(`/question-bank/${bankId}`);
        },
        onError: (err) => {
            error(err.message || "Failed to create question");
        },
    });

    const handleSave = (question: Question) => {
        track("question_created", {
            questionType: question.type,
            bankId,
        });

        if (question.type === "MCQ" || question.type === "MMCQ") {
            const mcqQuestion = question as Question & {
                questionData: { options: import("@/types/questions").QuestionOption[] };
                solution: { correctOptions: { id: string; isCorrect: boolean }[] };
            };

            createMutation.mutate({
                bankId,
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
                bankId,
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
                bankId,
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
                bankId,
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
                bankId,
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
        router.push(`/question-bank/${bankId}`);
    };

    return (
        <AuthGuard requiredGroups={[UserType.MANAGER, UserType.STAFF]}>
            <QuestionForm
                onSave={handleSave}
                onCancel={handleCancel}
                isLoading={createMutation.isPending}
                context="bank"
                bankId={bankId}
            />
        </AuthGuard>
    );
}
