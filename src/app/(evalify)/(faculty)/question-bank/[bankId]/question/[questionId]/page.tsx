"use client";

import { useRouter, useParams } from "next/navigation";
import QuestionForm from "@/components/question/create-edit/question-form";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
    DescriptiveConfig,
    FillInBlanksConfig,
    MatchOptions,
    Question,
    QuestionOption,
} from "@/types/questions";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";

export default function QuestionPage() {
    const router = useRouter();
    const { success, error } = useToast();
    const { track } = useAnalytics();
    const utils = trpc.useUtils();

    const routeParams = useParams<{ bankId: string; questionId: string }>();
    const bankId = Array.isArray(routeParams.bankId) ? routeParams.bankId[0] : routeParams.bankId;
    const questionId = Array.isArray(routeParams.questionId)
        ? routeParams.questionId[0]
        : routeParams.questionId;

    const isCreateMode = questionId === "create";

    // Only fetch question data if we're in edit mode
    const { data: questionData, isLoading } = trpc.question.getById.useQuery(
        { questionId: questionId!, bankId: bankId! },
        { enabled: !isCreateMode && !!bankId && !!questionId }
    );

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

    const updateMutation = trpc.question.update.useMutation({
        onSuccess: () => {
            success("Question updated successfully!");
            utils.question.listByBank.invalidate({ bankId });
            utils.question.getById.invalidate({ questionId, bankId });
            router.push(`/question-bank/${bankId}`);
        },
        onError: (err) => {
            error(err.message || "Failed to update question");
        },
    });

    const handleSave = (question: Question) => {
        if (isCreateMode) {
            track("question_created", {
                questionType: question.type,
                bankId,
            });

            if (question.type === "MCQ" || question.type === "MMCQ") {
                const mcqQuestion = question as Question & {
                    questionData: { options: QuestionOption[] };
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
                    blankConfig: FillInBlanksConfig;
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
                    descriptiveConfig: DescriptiveConfig;
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
                    options: MatchOptions[];
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
        } else {
            track("question_updated", {
                questionId,
                questionType: question.type,
                bankId,
            });

            if (question.type === "MCQ" || question.type === "MMCQ") {
                const mcqQuestion = question as Question & {
                    questionData: { options: QuestionOption[] };
                    solution: { correctOptions: { id: string; isCorrect: boolean }[] };
                };

                updateMutation.mutate({
                    questionId,
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
                const tfQuestion = question as Question & { trueFalseAnswer: boolean };

                updateMutation.mutate({
                    questionId,
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
                    blankConfig: FillInBlanksConfig;
                };

                updateMutation.mutate({
                    questionId,
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
                    descriptiveConfig: DescriptiveConfig;
                };

                updateMutation.mutate({
                    questionId,
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
                    options: MatchOptions[];
                };

                updateMutation.mutate({
                    questionId,
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
        }
    };

    const handleCancel = () => {
        router.push(`/question-bank/${bankId}`);
    };

    // Show loading state only in edit mode while fetching data
    if (!isCreateMode && isLoading) {
        return (
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
        );
    }

    // Show "not found" only in edit mode when data is missing
    if (!isCreateMode && !questionData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card>
                    <CardContent className="p-8">
                        <p className="text-sm text-muted-foreground">Question not found</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <QuestionForm
            initialData={isCreateMode ? undefined : (questionData as unknown as Question)}
            onSave={handleSave}
            onCancel={handleCancel}
            isLoading={isCreateMode ? createMutation.isPending : updateMutation.isPending}
            context="bank"
            bankId={bankId}
        />
    );
}
