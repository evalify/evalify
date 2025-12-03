"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
    ArrowLeft,
    User,
    Clock,
    Calendar,
    Award,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Timer,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import QuestionRender from "@/components/question/question-renderer/QuestionRender";
import type { Question, QuestionType } from "@/types/questions";

interface StudentResultViewProps {
    quizId: string;
    studentId: string;
}

type SubmissionStatus = "NOT_SUBMITTED" | "SUBMITTED" | "AUTO_SUBMITTED";
type EvaluationStatus = "NOT_EVALUATED" | "EVALUATED" | "EVALUATED_MANUALLY" | "FAILED";

interface EvaluationResult {
    status: "UNEVALUATED" | "EVALUATED" | "EVALUATED_MANUALLY";
    mark: number;
    remarks?: string;
}

interface EvaluationResults {
    data: Record<string, EvaluationResult>;
    v: string;
}

// Type for student response answers
interface StudentResponseData {
    [questionId: string]: unknown;
}

function getStatusConfig(status: SubmissionStatus | null) {
    switch (status) {
        case "SUBMITTED":
            return {
                label: "Submitted",
                color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                icon: CheckCircle2,
            };
        case "AUTO_SUBMITTED":
            return {
                label: "Auto Submitted",
                color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                icon: Timer,
            };
        case "NOT_SUBMITTED":
            return {
                label: "Not Submitted",
                color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                icon: XCircle,
            };
        default:
            return {
                label: "Not Started",
                color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
                icon: AlertCircle,
            };
    }
}

function getEvaluationStatusConfig(status: EvaluationStatus | null) {
    switch (status) {
        case "EVALUATED":
            return {
                label: "Auto Evaluated",
                color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
            };
        case "EVALUATED_MANUALLY":
            return {
                label: "Manually Evaluated",
                color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
            };
        case "FAILED":
            return {
                label: "Evaluation Failed",
                color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
            };
        default:
            return {
                label: "Not Evaluated",
                color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
            };
    }
}

export function StudentResultView({ quizId, studentId }: StudentResultViewProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { track } = useAnalytics();
    const utils = trpc.useUtils();

    const [localEvaluationResults, setLocalEvaluationResults] = useState<EvaluationResults | null>(
        null
    );

    // Ref to store pending mutation context for error recovery
    const pendingMutationRef = useRef<{
        previousEvaluationResults: EvaluationResults | null;
    } | null>(null);

    const { data, isLoading, error } = trpc.facultyQuiz.getStudentResultDetails.useQuery({
        quizId,
        studentId,
    });

    const updateMutation = trpc.facultyQuiz.updateEvaluationResults.useMutation({
        onSuccess: (result, variables) => {
            // Clear pending mutation context
            pendingMutationRef.current = null;
            // Update local state from variables to ensure final consistency
            setLocalEvaluationResults(variables.evaluationResults as EvaluationResults);
            toast("success", "Marks saved", {
                description: `Score: ${result.score}`,
            });
            track("quiz_evaluation_saved", {
                quizId,
                studentId,
                newScore: result.score,
            });
            utils.facultyQuiz.getStudentResultDetails.invalidate({
                quizId,
                studentId,
            });
            utils.facultyQuiz.getStudentResponses.invalidate({ quizId });
        },
        onError: (err) => {
            // Restore previous evaluation state on error using ref
            const ctx = pendingMutationRef.current;
            if (ctx) {
                setLocalEvaluationResults(ctx.previousEvaluationResults);
                pendingMutationRef.current = null;
            }
            // Invalidate cache to refetch authoritative data
            utils.facultyQuiz.getStudentResultDetails.invalidate({
                quizId,
                studentId,
            });
            utils.facultyQuiz.getStudentResponses.invalidate({ quizId });
            toast("error", "Error saving", {
                description: err.message,
            });
        },
    });

    // Initialize local evaluation results from server data
    const evaluationResults = useMemo(() => {
        if (localEvaluationResults) return localEvaluationResults;

        if (data?.response?.evaluationResults) {
            return data.response.evaluationResults as EvaluationResults;
        }

        // Create initial empty evaluation results
        if (data?.questions) {
            const initial: EvaluationResults = {
                data: {},
                v: "v1",
            };
            for (const q of data.questions) {
                initial.data[q.id] = {
                    status: "UNEVALUATED",
                    mark: 0,
                    remarks: "",
                };
            }
            return initial;
        }

        return null;
    }, [data, localEvaluationResults]);

    // Parse student responses
    const studentResponses = useMemo(() => {
        if (!data?.response?.response) return {};
        return data.response.response as StudentResponseData;
    }, [data]);

    // Format questions for the renderer
    const formattedQuestions = useMemo(() => {
        if (!data?.questions) return [];

        return data.questions.map((q) => {
            const questionData = q.questionData as Record<string, unknown>;
            const solution = q.solution as Record<string, unknown>;

            // Build question object based on type
            const baseQuestion = {
                id: q.id,
                type: q.type as QuestionType,
                question: q.question,
                marks: q.marks ?? 1,
                negativeMarks: q.negativeMarks ?? 0,
                explanation: q.explanation ?? undefined,
                difficulty: q.difficulty ?? undefined,
                courseOutcome: q.courseOutcome ?? undefined,
                bloomTaxonomyLevel: q.bloomTaxonomyLevel ?? undefined,
                topics: q.topics,
                bankName: q.bankName,
                quizQuestionId: q.quizQuestionId,
                orderIndex: q.orderIndex,
            };

            // Add type-specific data
            switch (q.type) {
                case "MCQ":
                    return {
                        ...baseQuestion,
                        questionData: questionData,
                        solution: solution,
                    } as Question;
                case "MMCQ":
                    return {
                        ...baseQuestion,
                        questionData: questionData,
                        solution: solution,
                    } as Question;
                case "TRUE_FALSE":
                    return {
                        ...baseQuestion,
                        trueFalseAnswer: (solution as { trueFalseAnswer?: boolean })
                            ?.trueFalseAnswer,
                    } as Question;
                case "FILL_THE_BLANK":
                    return {
                        ...baseQuestion,
                        blankConfig: {
                            ...(questionData as { config?: Record<string, unknown> })?.config,
                            ...(solution as { acceptableAnswers?: Record<string, unknown> }),
                        },
                    } as Question;
                case "MATCHING":
                    return {
                        ...baseQuestion,
                        options: (questionData as { options?: unknown[] })?.options?.map(
                            (opt: unknown) => {
                                const optObj = opt as Record<string, unknown>;
                                const solutionOpts = (
                                    solution as { options?: Record<string, unknown>[] }
                                )?.options;
                                const matchPairIds = solutionOpts?.find(
                                    (s) => s.id === optObj.id
                                )?.matchPairIds;
                                return {
                                    ...optObj,
                                    matchPairIds: matchPairIds as string[] | undefined,
                                };
                            }
                        ),
                    } as Question;
                case "DESCRIPTIVE":
                    return {
                        ...baseQuestion,
                        descriptiveConfig: {
                            ...(questionData as { config?: Record<string, unknown> })?.config,
                            ...(solution as Record<string, unknown>),
                        },
                    } as Question;
                default:
                    return baseQuestion as Question;
            }
        });
    }, [data]);

    // Get student answer for a specific question
    const getStudentAnswer = useCallback(
        (questionId: string, questionType: string) => {
            const response = studentResponses[questionId];
            if (response === undefined || response === null) return undefined;

            switch (questionType) {
                case "MCQ":
                    return { selectedOptionId: response as string };
                case "MMCQ":
                    return { selectedOptionIds: response as string[] };
                case "TRUE_FALSE":
                    return { selectedAnswer: response as boolean };
                case "FILL_THE_BLANK":
                    return { blankAnswers: response as Record<number, string> };
                case "MATCHING":
                    return { matches: response as Record<string, string> };
                case "DESCRIPTIVE":
                    return { descriptiveAnswer: response as string };
                default:
                    return undefined;
            }
        },
        [studentResponses]
    );

    // Handle score edit for a question (with optional remarks) - saves immediately
    const handleEditScore = useCallback(
        (questionId: string, newScore: number | null, newRemarks?: string) => {
            if (!evaluationResults) return;

            // Capture previous evaluation state before optimistic update
            const previousEvaluationResults = localEvaluationResults;

            const newResults: EvaluationResults = {
                ...evaluationResults,
                data: {
                    ...evaluationResults.data,
                    [questionId]: {
                        ...evaluationResults.data[questionId],
                        status: "EVALUATED_MANUALLY",
                        mark: newScore ?? 0,
                        remarks: newRemarks,
                    },
                },
            };

            // Store context for error recovery before mutating
            pendingMutationRef.current = {
                previousEvaluationResults,
            };

            // Optimistic update for immediate UI feedback
            setLocalEvaluationResults(newResults);

            // Save to server
            updateMutation.mutate({
                quizId,
                studentId,
                evaluationResults: newResults,
            });
        },
        [evaluationResults, localEvaluationResults, quizId, studentId, updateMutation]
    );

    // Calculate total score by summing all individual marks
    const totalScore = useMemo(() => {
        if (!evaluationResults) return 0;
        // Sum up all marks from evaluation results
        return Object.values(evaluationResults.data).reduce((sum, e) => sum + (e.mark || 0), 0);
    }, [evaluationResults]);

    // Calculate max possible score
    const maxScore = useMemo(() => {
        if (!formattedQuestions) return 0;
        return formattedQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
    }, [formattedQuestions]);

    // Navigation to prev/next student
    const handleNavigation = useCallback(
        (direction: "prev" | "next") => {
            // TODO: Implement student navigation
            toast("info", "Navigation", {
                description: `${direction === "prev" ? "Previous" : "Next"} student navigation coming soon`,
            });
        },
        [toast]
    );

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-6 space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-48 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="container mx-auto px-4 py-6">
                <Card className="border-destructive">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 text-destructive">
                            <AlertCircle className="h-6 w-6" />
                            <div>
                                <p className="font-semibold">Error loading student result</p>
                                <p className="text-sm text-muted-foreground">
                                    {error?.message || "Could not load student response data"}
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Go Back
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { student, response } = data;
    const submissionStatusConfig = getStatusConfig(response.submissionStatus);
    const evaluationStatusConfig = getEvaluationStatusConfig(response.evaluationStatus);
    const SubmissionIcon = submissionStatusConfig.icon;

    return (
        <div className="container mx-auto px-4 py-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold">Student Response</h1>
                        <p className="text-sm text-muted-foreground">
                            Review and evaluate quiz submission
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleNavigation("prev")}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Previous Student</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleNavigation("next")}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Next Student</TooltipContent>
                    </Tooltip>
                </div>
            </div>

            <Card>
                <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex items-center gap-4 flex-1">
                            <Avatar className="h-14 w-14">
                                <AvatarImage src={student.profileImage || undefined} />
                                <AvatarFallback className="text-lg">
                                    {student.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .toUpperCase()
                                        .slice(0, 2)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    {student.name}
                                    {response.isViolated && (
                                        <Badge variant="destructive" className="text-xs">
                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                            Violation
                                        </Badge>
                                    )}
                                </h2>
                                <p className="text-sm text-muted-foreground">{student.email}</p>
                                <p className="text-sm text-muted-foreground font-mono">
                                    {student.profileId}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Badge
                                variant="outline"
                                className={cn("gap-1", submissionStatusConfig.color)}
                            >
                                <SubmissionIcon className="h-3 w-3" />
                                {submissionStatusConfig.label}
                            </Badge>
                            <Badge
                                variant="outline"
                                className={cn("gap-1", evaluationStatusConfig.color)}
                            >
                                {evaluationStatusConfig.label}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Started</p>
                                <p className="text-sm font-medium">
                                    {response.startTime
                                        ? format(new Date(response.startTime), "MMM dd, p")
                                        : "-"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Submitted</p>
                                <p className="text-sm font-medium">
                                    {response.submissionTime
                                        ? format(new Date(response.submissionTime), "MMM dd, p")
                                        : "-"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Score</p>
                                <p className="text-sm font-medium">
                                    <span
                                        className={cn(
                                            "font-bold",
                                            totalScore === maxScore
                                                ? "text-green-600"
                                                : totalScore === 0
                                                  ? "text-red-600"
                                                  : "text-yellow-600"
                                        )}
                                    >
                                        {totalScore}
                                    </span>
                                    <span className="text-muted-foreground"> / {maxScore}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Questions</p>
                                <p className="text-sm font-medium">{formattedQuestions.length}</p>
                            </div>
                        </div>
                    </div>

                    {response.violations && response.violations.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium text-destructive mb-2">
                                Violations Detected:
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {response.violations.map((v, i) => (
                                    <Badge key={i} variant="destructive" className="text-xs">
                                        {v}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Questions & Responses</h2>
                {formattedQuestions.map((question, index) => {
                    if (!question.id) return null;
                    const studentAnswer = getStudentAnswer(question.id, question.type);
                    const evalResult = evaluationResults?.data[question.id];

                    return (
                        <QuestionRender
                            key={question.id}
                            question={question}
                            questionNumber={index + 1}
                            showMetadata={true}
                            showSolution={true}
                            showExplanation={true}
                            isReadOnly={true}
                            compareWithStudentAnswer={true}
                            studentScore={evalResult?.mark ?? null}
                            evaluationStatus={evalResult?.status}
                            remarks={evalResult?.remarks}
                            onEditScore={handleEditScore}
                            // Pass student answers based on question type
                            selectedOptionId={studentAnswer?.selectedOptionId}
                            selectedOptionIds={studentAnswer?.selectedOptionIds}
                            selectedAnswer={studentAnswer?.selectedAnswer}
                            blankAnswers={studentAnswer?.blankAnswers}
                            matches={studentAnswer?.matches}
                            descriptiveAnswer={studentAnswer?.descriptiveAnswer}
                        />
                    );
                })}
            </div>
        </div>
    );
}
