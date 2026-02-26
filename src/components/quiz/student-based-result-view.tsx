"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceStrict } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    Hash,
    Shield,
    Globe,
    TrendingUp,
    Minus,
    CircleDot,
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

/**
 * Circular score indicator rendered with SVG.
 * Shows percentage filled with adaptive coloring.
 */
function ScoreRing({
    score,
    maxScore,
    size = 100,
    strokeWidth = 8,
}: {
    score: number;
    maxScore: number;
    size?: number;
    strokeWidth?: number;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const offset = circumference - (percentage / 100) * circumference;

    const getColor = () => {
        if (percentage >= 80) return "text-green-500";
        if (percentage >= 50) return "text-yellow-500";
        if (percentage >= 25) return "text-orange-500";
        return "text-red-500";
    };

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90" width={size} height={size}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                    className="stroke-muted"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className={cn(
                        "transition-all duration-700 ease-out stroke-current",
                        getColor()
                    )}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn("text-xl font-bold", getColor())}>{score}</span>
                <span className="text-[10px] text-muted-foreground font-medium">/ {maxScore}</span>
            </div>
        </div>
    );
}

/**
 * Small pill for the question navigation sidebar.
 * Shows question number with color-coded evaluation status.
 */
function QuestionNavPill({
    index,
    questionId,
    evalStatus,
    isActive,
    hasResponse,
    onClick,
}: {
    index: number;
    questionId: string;
    evalStatus?: EvaluationResult;
    isActive: boolean;
    hasResponse: boolean;
    onClick: () => void;
}) {
    const getNavColor = () => {
        if (!hasResponse) return "bg-muted text-muted-foreground border-transparent";
        if (!evalStatus || evalStatus.status === "UNEVALUATED")
            return "bg-gray-100 dark:bg-gray-800 text-foreground border-gray-300 dark:border-gray-600";
        if (evalStatus.mark > 0)
            return "bg-green-500 text-white border-green-600 dark:bg-green-600 dark:border-green-700";
        return "bg-red-500 text-white border-red-600 dark:bg-red-600 dark:border-red-700";
    };

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={onClick}
                    className={cn(
                        "w-10 h-10 rounded-full border text-sm font-semibold transition-all flex items-center justify-center shadow-sm",
                        getNavColor(),
                        isActive &&
                            "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                    )}
                >
                    {index + 1}
                </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
                <p>
                    Q{index + 1}{" "}
                    {!hasResponse
                        ? "— No response"
                        : evalStatus?.status === "UNEVALUATED"
                          ? "— Unevaluated"
                          : `— ${evalStatus?.mark ?? 0} marks`}
                </p>
            </TooltipContent>
        </Tooltip>
    );
}

export function StudentResultView({ quizId, studentId }: StudentResultViewProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { track } = useAnalytics();
    const utils = trpc.useUtils();

    const [activeQuestionIndex, setActiveQuestionIndex] = useState<number | null>(null);
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
            pendingMutationRef.current = null;
            setLocalEvaluationResults(variables.evaluationResults as EvaluationResults);
            toast("success", "Marks saved", {
                description: `Score: ${result.score}`,
            });
            track("quiz_evaluation_saved", {
                quizId,
                studentId,
                newScore: result.score,
            });
            utils.facultyQuiz.getStudentResultDetails.invalidate({ quizId, studentId });
            utils.facultyQuiz.getStudentResponses.invalidate({ quizId });
        },
        onError: (err) => {
            const ctx = pendingMutationRef.current;
            if (ctx) {
                setLocalEvaluationResults(ctx.previousEvaluationResults);
                pendingMutationRef.current = null;
            }
            utils.facultyQuiz.getStudentResultDetails.invalidate({ quizId, studentId });
            utils.facultyQuiz.getStudentResponses.invalidate({ quizId });
            toast("error", "Error saving", { description: err.message });
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
            /**
             * Unwrap versioned JSON stored as { version: N, data: { ... } }.
             * All questionData and solution columns are wrapped via versioning utilities.
             */
            function unwrapVersioned(data: unknown): Record<string, unknown> {
                if (data && typeof data === "object" && "version" in data && "data" in data) {
                    return (data as { data: Record<string, unknown> }).data;
                }
                return data as Record<string, unknown>;
            }

            const questionData = unwrapVersioned(q.questionData);
            const solution = unwrapVersioned(q.solution);

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

            switch (q.type) {
                case "MCQ":
                    return { ...baseQuestion, questionData, solution } as Question;
                case "MMCQ":
                    return { ...baseQuestion, questionData, solution } as Question;
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

    /**
     * Extracts and normalizes the student's answer for a given question.
     * Answers are stored as `{ studentAnswer: value }` objects by the exam client.
     * Handles legacy single-value matching format and True/False string→boolean conversion.
     */
    const getStudentAnswer = useCallback(
        (questionId: string, questionType: string) => {
            const response = studentResponses[questionId];
            if (response === undefined || response === null) return undefined;

            // Unwrap the { studentAnswer: ... } wrapper written by the exam client
            const wrapper = response as Record<string, unknown>;
            const raw = "studentAnswer" in wrapper ? wrapper.studentAnswer : response;

            if (raw === undefined || raw === null) return undefined;

            switch (questionType) {
                case "MCQ":
                    return { selectedOptionId: raw as string };
                case "MMCQ":
                    return { selectedOptionIds: Array.isArray(raw) ? (raw as string[]) : [] };
                case "TRUE_FALSE":
                    // stored as string "True"/"False", renderer expects boolean
                    return { selectedAnswer: raw === "True" || raw === true };
                case "FILL_THE_BLANK":
                    return { blankAnswers: raw as Record<number, string> };
                case "MATCHING": {
                    // Normalize: handle both legacy Record<string,string> and current Record<string,string[]>
                    const rawMatches = raw as Record<string, unknown>;
                    const normalized: Record<string, string[]> = {};
                    for (const [key, val] of Object.entries(rawMatches)) {
                        if (Array.isArray(val)) {
                            normalized[key] = val.filter((v): v is string => typeof v === "string");
                        } else if (typeof val === "string" && val) {
                            normalized[key] = [val];
                        }
                    }
                    return { matches: normalized };
                }
                case "DESCRIPTIVE":
                    return { descriptiveAnswer: raw as string };
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

            const previousEvaluationResults = localEvaluationResults;
            const prevEval = evaluationResults.data[questionId] ?? {
                status: "UNEVALUATED" as EvaluationResult["status"],
                mark: 0,
                remarks: "",
            };
            const isCleared = newScore === null;

            const newResults: EvaluationResults = {
                ...evaluationResults,
                data: {
                    ...evaluationResults.data,
                    [questionId]: {
                        ...prevEval,
                        status: isCleared ? "UNEVALUATED" : "EVALUATED_MANUALLY",
                        mark: isCleared ? 0 : (newScore ?? 0),
                        remarks: newRemarks ?? prevEval.remarks,
                    },
                },
            };

            pendingMutationRef.current = { previousEvaluationResults };
            setLocalEvaluationResults(newResults);

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
        return Object.values(evaluationResults.data).reduce((sum, e) => sum + (e.mark || 0), 0);
    }, [evaluationResults]);

    // Calculate max possible score
    const maxScore = useMemo(() => {
        if (!formattedQuestions) return 0;
        return formattedQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
    }, [formattedQuestions]);

    // Calculate stats
    const questionStats = useMemo(() => {
        if (!formattedQuestions || !evaluationResults)
            return { answered: 0, unanswered: 0, correct: 0, incorrect: 0, partial: 0 };

        let answered = 0;
        let unanswered = 0;
        let correct = 0;
        let incorrect = 0;
        let partial = 0;

        for (const q of formattedQuestions) {
            if (!q.id) continue;
            const hasAnswer =
                studentResponses[q.id] !== undefined && studentResponses[q.id] !== null;
            if (hasAnswer) {
                answered++;
            } else {
                unanswered++;
            }

            const evalResult = evaluationResults.data[q.id];
            if (evalResult && evalResult.status !== "UNEVALUATED") {
                const qMarks = q.marks || 1;
                if (evalResult.mark >= qMarks) correct++;
                else if (evalResult.mark > 0) partial++;
                else incorrect++;
            }
        }

        return { answered, unanswered, correct, incorrect, partial };
    }, [formattedQuestions, evaluationResults, studentResponses]);

    // Time taken
    const timeTaken = useMemo(() => {
        if (!data?.response?.startTime) return null;
        const start = new Date(data.response.startTime);
        const end = data.response.submissionTime
            ? new Date(data.response.submissionTime)
            : data.response.endTime
              ? new Date(data.response.endTime)
              : null;
        if (!end) return null;
        return formatDistanceStrict(start, end);
    }, [data]);

    // Scroll to a question by index
    const scrollToQuestion = useCallback((index: number) => {
        setActiveQuestionIndex(index);
        const el = document.getElementById(`question-${index}`);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, []);

    // Navigation to prev/next student
    const handleNavigation = useCallback(
        (direction: "prev" | "next") => {
            toast("info", "Navigation", {
                description: `${direction === "prev" ? "Previous" : "Next"} student navigation coming soon`,
            });
        },
        [toast]
    );

    // Loading skeleton
    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
                {/* Header skeleton */}
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <Skeleton className="h-7 w-48" />
                </div>
                {/* Student info skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-16 w-16 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-6 w-40" />
                                        <Skeleton className="h-4 w-56" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <Card>
                        <CardContent className="p-6 flex items-center justify-center">
                            <Skeleton className="h-24 w-24 rounded-full" />
                        </CardContent>
                    </Card>
                </div>
                {/* Questions skeleton */}
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6 space-y-3">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (error || !data) {
        return (
            <div className="container mx-auto px-4 py-6 max-w-6xl">
                <Card className="border-destructive/50">
                    <CardContent className="p-8">
                        <div className="flex flex-col items-center justify-center text-center gap-4">
                            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
                                <AlertCircle className="h-7 w-7 text-destructive" />
                            </div>
                            <div>
                                <p className="text-lg font-semibold">
                                    Failed to load student result
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {error?.message ||
                                        "Could not load student response data. The student may not have attempted the quiz."}
                                </p>
                            </div>
                            <Button variant="outline" onClick={() => router.back()}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Go Back
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { student, response } = data;
    const submissionStatusConfig = getStatusConfig(response.submissionStatus);
    const evaluationStatusConfig = getEvaluationStatusConfig(response.evaluationStatus);
    const SubmissionIcon = submissionStatusConfig.icon;
    const scorePercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    return (
        <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
            {/* ── Top navigation bar ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="shrink-0"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
                            Student Response
                        </h1>
                        <p className="text-xs text-muted-foreground hidden sm:block">
                            Review and evaluate submission
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
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
                                className="h-8 w-8"
                                onClick={() => handleNavigation("next")}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Next Student</TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {/* ── Student profile & score overview ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Student info card */}
                <Card className="lg:col-span-2 overflow-hidden">
                    <CardContent className="p-0">
                        <div className="flex flex-col sm:flex-row">
                            {/* Student identity */}
                            <div className="flex-1 p-5 sm:p-6">
                                <div className="flex items-start gap-4">
                                    <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
                                        <AvatarImage src={student.profileImage || undefined} />
                                        <AvatarFallback className="text-base font-semibold bg-primary/10 text-primary">
                                            {student.name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")
                                                .toUpperCase()
                                                .slice(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="text-lg font-semibold truncate">
                                                {student.name}
                                            </h2>
                                            {response.isViolated && (
                                                <Badge
                                                    variant="destructive"
                                                    className="text-xs gap-1"
                                                >
                                                    <AlertTriangle className="h-3 w-3" />
                                                    Violation
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {student.email}
                                        </p>
                                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                            {student.profileId}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-2 mt-3">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "gap-1 text-xs",
                                                    submissionStatusConfig.color
                                                )}
                                            >
                                                <SubmissionIcon className="h-3 w-3" />
                                                {submissionStatusConfig.label}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "gap-1 text-xs",
                                                    evaluationStatusConfig.color
                                                )}
                                            >
                                                {evaluationStatusConfig.label}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <Separator className="my-4" />

                                {/* Meta grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="space-y-0.5">
                                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            Started
                                        </p>
                                        <p className="text-sm font-medium">
                                            {response.startTime
                                                ? format(new Date(response.startTime), "MMM dd, p")
                                                : "—"}
                                        </p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            Submitted
                                        </p>
                                        <p className="text-sm font-medium">
                                            {response.submissionTime
                                                ? format(
                                                      new Date(response.submissionTime),
                                                      "MMM dd, p"
                                                  )
                                                : "—"}
                                        </p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <Timer className="h-3 w-3" />
                                            Duration
                                        </p>
                                        <p className="text-sm font-medium">{timeTaken ?? "—"}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <Globe className="h-3 w-3" />
                                            IP Address
                                        </p>
                                        <p className="text-sm font-medium font-mono">
                                            {response.ip ?? "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Score card */}
                <Card>
                    <CardContent className="p-5 sm:p-6 flex flex-col items-center justify-center h-full gap-3">
                        <ScoreRing
                            score={totalScore}
                            maxScore={maxScore}
                            size={110}
                            strokeWidth={9}
                        />
                        <div className="text-center space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Total Score
                            </p>
                            <p className="text-sm text-muted-foreground">{scorePercentage}%</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Stats bar ── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Card className="border-dashed">
                    <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                            <Hash className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-sm font-semibold">{formattedQuestions.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-dashed">
                    <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Answered</p>
                            <p className="text-sm font-semibold">{questionStats.answered}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-dashed">
                    <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Correct</p>
                            <p className="text-sm font-semibold">{questionStats.correct}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-dashed">
                    <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
                            <CircleDot className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Partial</p>
                            <p className="text-sm font-semibold">{questionStats.partial}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-dashed">
                    <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Incorrect</p>
                            <p className="text-sm font-semibold">{questionStats.incorrect}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Violations banner ── */}
            {response.violations && response.violations.length > 0 && (
                <Card className="border-destructive/30 bg-destructive/5">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-md bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Shield className="h-4 w-4 text-destructive" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-destructive">
                                    Violations Detected ({response.violations.length})
                                </p>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {response.violations.map((v, i) => (
                                        <Badge
                                            key={i}
                                            variant="destructive"
                                            className="text-xs font-normal"
                                        >
                                            {v}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Questions area with sidebar navigation ── */}
            <div className="flex gap-6">
                {/* Sticky question nav sidebar (hidden on small screens) */}
                <div className="hidden lg:block shrink-0">
                    <div className="sticky top-20">
                        <Card className="w-22">
                            <CardHeader className="p-3 pb-2">
                                <p className="text-xs font-semibold text-muted-foreground text-center uppercase tracking-wider">
                                    Q&apos;s
                                </p>
                            </CardHeader>
                            <CardContent className="px-2 pb-3 pt-0">
                                <ScrollArea className="max-h-[55vh]">
                                    <div className="flex flex-col gap-2.5 items-center py-3 px-1">
                                        {formattedQuestions.map((q, i) => (
                                            <QuestionNavPill
                                                key={q.id ?? i}
                                                index={i}
                                                questionId={q.id ?? ""}
                                                evalStatus={
                                                    q.id ? evaluationResults?.data[q.id] : undefined
                                                }
                                                isActive={activeQuestionIndex === i}
                                                hasResponse={
                                                    q.id
                                                        ? studentResponses[q.id] !== undefined &&
                                                          studentResponses[q.id] !== null
                                                        : false
                                                }
                                                onClick={() => scrollToQuestion(i)}
                                            />
                                        ))}
                                    </div>
                                </ScrollArea>
                                {/* Color legend */}
                                <Separator className="my-2" />
                                <div className="space-y-1.5 px-1">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                                        <span className="text-[9px] text-muted-foreground leading-none">
                                            Correct
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                                        <span className="text-[9px] text-muted-foreground leading-none">
                                            Wrong
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
                                        <span className="text-[9px] text-muted-foreground leading-none">
                                            Pending
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-muted shrink-0" />
                                        <span className="text-[9px] text-muted-foreground leading-none">
                                            Skipped
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Questions list */}
                <div className="flex-1 space-y-4 min-w-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold tracking-tight">
                            Questions & Responses
                        </h2>
                        <Badge variant="secondary" className="text-xs font-normal">
                            {formattedQuestions.length} questions
                        </Badge>
                    </div>

                    {formattedQuestions.map((question, index) => {
                        if (!question.id) return null;
                        const studentAnswer = getStudentAnswer(question.id, question.type);
                        const evalResult = evaluationResults?.data[question.id];
                        const hasResponse =
                            studentResponses[question.id] !== undefined &&
                            studentResponses[question.id] !== null;

                        return (
                            <div
                                key={question.id}
                                id={`question-${index}`}
                                className="scroll-mt-20"
                            >
                                {/* Unanswered indicator */}
                                {!hasResponse && (
                                    <div className="flex items-center gap-2 mb-2 px-1">
                                        <Minus className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">
                                            No response submitted
                                        </span>
                                    </div>
                                )}
                                <QuestionRender
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
                                    selectedOptionId={studentAnswer?.selectedOptionId}
                                    selectedOptionIds={studentAnswer?.selectedOptionIds}
                                    selectedAnswer={studentAnswer?.selectedAnswer}
                                    blankAnswers={studentAnswer?.blankAnswers}
                                    matches={studentAnswer?.matches}
                                    descriptiveAnswer={studentAnswer?.descriptiveAnswer}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Mobile floating bottom question nav ── */}
            <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
                <div className="bg-background/80 backdrop-blur-lg border-t shadow-lg">
                    {/* Mini progress indicator */}
                    <div className="h-0.5 bg-muted">
                        <div
                            className="h-full bg-green-500 transition-all duration-300"
                            style={{
                                width: `${formattedQuestions.length > 0 ? (questionStats.answered / formattedQuestions.length) * 100 : 0}%`,
                            }}
                        />
                    </div>
                    <div className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                            {/* Score badge */}
                            <div className="shrink-0 flex items-center gap-1.5 bg-muted/60 rounded-full px-2.5 py-1">
                                <Award className="h-3.5 w-3.5 text-primary" />
                                <span className="text-xs font-semibold">
                                    {totalScore}/{maxScore}
                                </span>
                            </div>
                            {/* Horizontally scrollable question pills */}
                            <div className="flex-1 overflow-x-auto scrollbar-none">
                                <div className="flex gap-2 px-1 py-1">
                                    {formattedQuestions.map((q, i) => {
                                        const evalSt = q.id
                                            ? evaluationResults?.data[q.id]
                                            : undefined;
                                        const hasResp = q.id
                                            ? studentResponses[q.id] !== undefined &&
                                              studentResponses[q.id] !== null
                                            : false;
                                        const isActive = activeQuestionIndex === i;

                                        const pillColor = !hasResp
                                            ? "bg-muted text-muted-foreground border-transparent"
                                            : !evalSt || evalSt.status === "UNEVALUATED"
                                              ? "bg-gray-100 dark:bg-gray-800 text-foreground border-gray-300 dark:border-gray-600"
                                              : evalSt.mark > 0
                                                ? "bg-green-500 text-white border-green-600"
                                                : "bg-red-500 text-white border-red-600";

                                        return (
                                            <button
                                                key={q.id ?? i}
                                                onClick={() => scrollToQuestion(i)}
                                                className={cn(
                                                    "w-8 h-8 rounded-full border text-xs font-semibold transition-all flex items-center justify-center shrink-0",
                                                    pillColor,
                                                    isActive &&
                                                        "ring-2 ring-primary ring-offset-1 ring-offset-background"
                                                )}
                                            >
                                                {i + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            {/* Answered count */}
                            <div className="shrink-0 text-[10px] text-muted-foreground font-medium">
                                {questionStats.answered}/{formattedQuestions.length}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Bottom spacer for mobile nav */}
            <div className="h-16 lg:hidden" />
        </div>
    );
}
