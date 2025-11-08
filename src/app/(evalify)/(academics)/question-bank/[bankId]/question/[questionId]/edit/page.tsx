"use client";

import { useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/auth-guard";
import { UserType } from "@/lib/auth/utils";
import QuestionForm from "@/components/question/create-edit/question-form";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Question } from "@/types/questions";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";

type Props = {
    params: { bankId: string; questionId: string };
};

export default function EditQuestionPage({ params }: Props) {
    const router = useRouter();
    const { success, error } = useToast();
    const { track } = useAnalytics();
    const utils = trpc.useUtils();

    const { data: questionData, isLoading } = trpc.question.getById.useQuery({
        questionId: params.questionId,
        bankId: params.bankId,
    });

    const updateMutation = trpc.question.update.useMutation({
        onSuccess: () => {
            success("Question updated successfully!");
            utils.question.listByBank.invalidate({ bankId: params.bankId });
            utils.question.getById.invalidate({
                questionId: params.questionId,
                bankId: params.bankId,
            });
            router.push(`/question-bank/${params.bankId}`);
        },
        onError: (err) => {
            error(err.message || "Failed to update question");
        },
    });

    const handleSave = (question: Question) => {
        track("question_updated", {
            questionId: params.questionId,
            questionType: question.type,
            bankId: params.bankId,
        });

        if (question.type === "MCQ" || question.type === "MMCQ") {
            const mcqQuestion = question as Question & {
                questionData: { options: import("@/types/questions").QuestionOption[] };
                solution: { correctOptions: { id: string; isCorrect: boolean }[] };
            };

            updateMutation.mutate({
                questionId: params.questionId,
                bankId: params.bankId,
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

            updateMutation.mutate({
                questionId: params.questionId,
                bankId: params.bankId,
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

            updateMutation.mutate({
                questionId: params.questionId,
                bankId: params.bankId,
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
        }
    };

    const handleCancel = () => {
        router.push(`/question-bank/${params.bankId}`);
    };

    return (
        <AuthGuard requiredGroups={[UserType.MANAGER, UserType.STAFF]}>
            {isLoading ? (
                <div className="flex items-center justify-center min-h-screen">
                    <Card>
                        <CardContent className="p-8">
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Loading question...</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : questionData ? (
                <QuestionForm
                    initialData={questionData as Question}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    isLoading={updateMutation.isPending}
                    context="bank"
                    bankId={params.bankId}
                />
            ) : (
                <div className="flex items-center justify-center min-h-screen">
                    <Card>
                        <CardContent className="p-8">
                            <p className="text-sm text-muted-foreground">Question not found</p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </AuthGuard>
    );
}
