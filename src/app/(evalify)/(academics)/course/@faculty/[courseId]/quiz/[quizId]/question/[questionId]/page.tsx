"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";
import QuestionForm from "@/components/question/create-edit/question-form";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import {
    Question,
    QuestionOption,
    FillInBlanksConfig,
    DescriptiveConfig,
    MatchOptions,
    BloomsLevel,
    Difficulty,
    CourseOutcome,
} from "@/types/questions";

type BaseQuestionInput = {
    quizId: string;
    courseId: string;
    sectionId?: string | null;
    question: string;
    marks: number;
    negativeMarks: number;
    difficulty?: Difficulty | null;
    courseOutcome?: CourseOutcome | null;
    bloomTaxonomyLevel?: BloomsLevel | null;
    topicIds?: string[] | null;
};

type MCQQuestionInput = BaseQuestionInput & {
    type: "MCQ";
    questionData: { options: QuestionOption[] };
    solution: { correctOptions: { id: string; isCorrect: boolean }[] };
};

type MMCQQuestionInput = BaseQuestionInput & {
    type: "MMCQ";
    questionData: { options: QuestionOption[] };
    solution: { correctOptions: { id: string; isCorrect: boolean }[] };
};

type TrueFalseQuestionInput = BaseQuestionInput & {
    type: "TRUE_FALSE";
    trueFalseAnswer: boolean;
    explanation?: string;
};

type FillTheBlankQuestionInput = BaseQuestionInput & {
    type: "FILL_THE_BLANK";
    blankConfig: FillInBlanksConfig;
    explanation?: string;
};

type DescriptiveQuestionInput = BaseQuestionInput & {
    type: "DESCRIPTIVE";
    descriptiveConfig: DescriptiveConfig;
    explanation?: string;
};

type MatchingQuestionInput = BaseQuestionInput & {
    type: "MATCHING";
    options: MatchOptions[];
    explanation?: string;
};

type CreateQuestionInput =
    | MCQQuestionInput
    | MMCQQuestionInput
    | TrueFalseQuestionInput
    | FillTheBlankQuestionInput
    | DescriptiveQuestionInput
    | MatchingQuestionInput;

type UpdateQuestionInput = CreateQuestionInput & {
    questionId: string;
};

export default function QuizQuestionPage() {
    const router = useRouter();
    const { success, error } = useToast();
    const { track } = useAnalytics();
    const searchParams = useSearchParams();
    const params = useParams<{ courseId: string; quizId: string; questionId: string }>();
    const courseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;
    const quizId = Array.isArray(params.quizId) ? params.quizId[0] : params.quizId;
    const questionId = Array.isArray(params.questionId) ? params.questionId[0] : params.questionId;
    const sectionId = searchParams.get("sectionId");

    const isCreateMode = questionId === "create";
    const shouldFetchQuestion = !isCreateMode && !!courseId && !!quizId && !!questionId;

    const { data: questionData, isLoading } = trpc.question.getByIdForQuiz.useQuery(
        { questionId: questionId!, quizId: quizId!, courseId: courseId! },
        { enabled: shouldFetchQuestion }
    );

    const createMutation = trpc.question.createForQuiz.useMutation({
        onSuccess: () => {
            success("Question created successfully!");
            router.push(`/course/${courseId}/quiz/${quizId}/view`);
        },
        onError: (err) => {
            error(err.message || "Failed to create question");
        },
    });

    const updateMutation = trpc.question.updateForQuiz.useMutation({
        onSuccess: () => {
            success("Question updated successfully!");
            router.push(`/course/${courseId}/quiz/${quizId}/view`);
        },
        onError: (err) => {
            error(err.message || "Failed to update question");
        },
    });

    const handleSave = (question: Question) => {
        if (isCreateMode) {
            track("quiz_question_created", {
                questionType: question.type,
                quizId,
                courseId,
            });
        } else {
            track("quiz_question_updated", {
                questionId,
                questionType: question.type,
                quizId,
                courseId,
            });
        }

        const baseInput = {
            quizId,
            courseId,
            sectionId: sectionId || null,
            question: question.question,
            marks: question.marks,
            negativeMarks: question.negativeMarks,
            difficulty: question.difficulty,
            bloomTaxonomyLevel: question.bloomsLevel,
            courseOutcome: question.courseOutcome,
            topicIds: (question.topics || []).map((t) => t.topicId),
        };

        if (question.type === "MCQ" || question.type === "MMCQ") {
            const mcqQuestion = question as Question & {
                questionData: { options: QuestionOption[] };
                solution: { correctOptions: { id: string; isCorrect: boolean }[] };
            };

            const input: CreateQuestionInput = {
                ...baseInput,
                type: question.type,
                questionData: mcqQuestion.questionData,
                solution: mcqQuestion.solution,
            };

            if (isCreateMode) {
                createMutation.mutate(input);
            } else {
                updateMutation.mutate({ ...input, questionId } as UpdateQuestionInput);
            }
        } else if (question.type === "TRUE_FALSE") {
            const tfQuestion = question as Question & {
                trueFalseAnswer: boolean;
            };

            const input: CreateQuestionInput = {
                ...baseInput,
                type: question.type,
                explanation: question.explanation,
                trueFalseAnswer: tfQuestion.trueFalseAnswer,
            };

            if (isCreateMode) {
                createMutation.mutate(input);
            } else {
                updateMutation.mutate({ ...input, questionId } as UpdateQuestionInput);
            }
        } else if (question.type === "FILL_THE_BLANK") {
            const fibQuestion = question as Question & {
                blankConfig: FillInBlanksConfig;
            };

            const input: CreateQuestionInput = {
                ...baseInput,
                type: question.type,
                explanation: question.explanation,
                blankConfig: fibQuestion.blankConfig,
            };

            if (isCreateMode) {
                createMutation.mutate(input);
            } else {
                updateMutation.mutate({ ...input, questionId } as UpdateQuestionInput);
            }
        } else if (question.type === "DESCRIPTIVE") {
            const descQuestion = question as Question & {
                descriptiveConfig: DescriptiveConfig;
            };

            const input: CreateQuestionInput = {
                ...baseInput,
                type: question.type,
                explanation: question.explanation,
                descriptiveConfig: descQuestion.descriptiveConfig,
            };

            if (isCreateMode) {
                createMutation.mutate(input);
            } else {
                updateMutation.mutate({ ...input, questionId } as UpdateQuestionInput);
            }
        } else if (question.type === "MATCHING") {
            const matchQuestion = question as Question & {
                options: MatchOptions[];
            };

            const input: CreateQuestionInput = {
                ...baseInput,
                type: question.type,
                explanation: question.explanation,
                options: matchQuestion.options,
            };

            if (isCreateMode) {
                createMutation.mutate(input);
            } else {
                updateMutation.mutate({ ...input, questionId } as UpdateQuestionInput);
            }
        }
    };

    const handleCancel = () => {
        router.push(`/course/${courseId}/quiz/${quizId}/view`);
    };

    return (
        <div>
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
            ) : !isCreateMode && !questionData ? (
                <div className="flex items-center justify-center min-h-screen">
                    <Card>
                        <CardContent className="p-8">
                            <p className="text-sm text-muted-foreground">Question not found</p>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <QuestionForm
                    initialData={!isCreateMode ? (questionData as unknown as Question) : undefined}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    isLoading={createMutation.isPending || updateMutation.isPending}
                    context="quiz"
                />
            )}
        </div>
    );
}
