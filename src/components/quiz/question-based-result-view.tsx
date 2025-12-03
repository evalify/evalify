"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Award,
    Search,
    Users,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { DropdownMultiSelect } from "@/components/ui/dropdown-multi-select";
import { QuestionRender } from "@/components/question/question-renderer";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import type { QuizQuestion } from "@/types/questions";

type StudentSourceFilter = "all" | "batch" | "individual";

interface QuestionResultViewProps {
    quizId: string;
    courseId: string;
    questionId: string;
}

interface EvaluationData {
    data: Record<
        string,
        {
            status: "UNEVALUATED" | "EVALUATED" | "EVALUATED_MANUALLY";
            mark: number;
            remarks?: string;
        }
    >;
    v: string;
}

interface ResponseData {
    data: Record<string, unknown>;
    v: string;
}

type EvaluationStatus = "UNEVALUATED" | "EVALUATED" | "EVALUATED_MANUALLY";

interface StudentAnswerProps {
    selectedOptionId?: string;
    selectedOptionIds?: string[];
    selectedAnswer?: boolean;
    blankAnswers?: Record<number, string>;
    matches?: Record<string, string>;
    descriptiveAnswer?: string;
}

function getEvaluationStatus(
    questionId: string,
    evaluationResults: EvaluationData | null
): { status: EvaluationStatus; mark: number | null; remarks?: string } {
    if (!evaluationResults?.data?.[questionId]) {
        return { status: "UNEVALUATED", mark: null };
    }
    const result = evaluationResults.data[questionId];
    return { status: result.status, mark: result.mark, remarks: result.remarks };
}

function getStudentAnswerProps(
    questionId: string,
    questionType: string,
    response: ResponseData | null
): StudentAnswerProps {
    const answer = response?.data?.[questionId];
    if (answer === undefined || answer === null) return {};

    switch (questionType) {
        case "MCQ":
            return { selectedOptionId: answer as string };
        case "MMCQ":
            return { selectedOptionIds: answer as string[] };
        case "TRUE_FALSE":
            return { selectedAnswer: answer as boolean };
        case "FILL_THE_BLANK":
            return { blankAnswers: answer as Record<number, string> };
        case "MATCHING":
            return { matches: answer as Record<string, string> };
        case "DESCRIPTIVE":
            return { descriptiveAnswer: answer as string };
        default:
            return {};
    }
}

export function QuestionResultView({ quizId, courseId, questionId }: QuestionResultViewProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { track } = useAnalytics();
    const utils = trpc.useUtils();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
    const [studentSourceFilter, setStudentSourceFilter] = useState<StudentSourceFilter>("all");
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize] = useState(10);

    // Track local evaluation states per student for immediate UI feedback
    const [localEvaluations, setLocalEvaluations] = useState<Record<string, EvaluationData>>({});

    // Ref to store pending mutation context for error recovery
    const pendingMutationRef = useRef<{
        studentId: string;
        previousEvaluation: EvaluationData | null;
    } | null>(null);

    const { data: batches, isLoading: batchesLoading } =
        trpc.facultyQuiz.getResultsBatches.useQuery({ quizId });

    const batchOptions = useMemo(
        () =>
            batches?.map((batch) => ({
                label: `${batch.name} - ${batch.section}`,
                value: batch.id,
            })) ?? [],
        [batches]
    );

    const { data, isLoading } = trpc.facultyQuiz.getQuestionResponses.useQuery({
        quizId,
        questionId,
        batchIds:
            studentSourceFilter !== "individual" && selectedBatchIds.length > 0
                ? selectedBatchIds
                : undefined,
        showIndividualOnly: studentSourceFilter === "individual" || undefined,
        searchTerm: searchQuery || undefined,
        limit: pageSize,
        offset: pageIndex * pageSize,
    });

    const updateMutation = trpc.facultyQuiz.updateEvaluationResults.useMutation({
        onSuccess: (result, variables) => {
            // Clear pending mutation context
            pendingMutationRef.current = null;
            // Update local state from variables to ensure final consistency
            setLocalEvaluations((prev) => ({
                ...prev,
                [variables.studentId]: variables.evaluationResults as EvaluationData,
            }));
            toast("success", "Marks saved", {
                description: `Score: ${result.score}`,
            });
            track("quiz_question_evaluation_saved", {
                quizId,
                questionId,
                studentId: variables.studentId,
                newScore: result.score,
            });
            utils.facultyQuiz.getQuestionResponses.invalidate({ quizId, questionId });
            utils.facultyQuiz.getStudentResponses.invalidate({ quizId });
        },
        onError: (err) => {
            // Restore previous evaluation state on error using ref
            const ctx = pendingMutationRef.current;
            if (ctx) {
                setLocalEvaluations((prev) => {
                    const updated = { ...prev };
                    if (ctx.previousEvaluation) {
                        updated[ctx.studentId] = ctx.previousEvaluation;
                    } else {
                        delete updated[ctx.studentId];
                    }
                    return updated;
                });
                pendingMutationRef.current = null;
            }
            // Invalidate cache to refetch authoritative data
            utils.facultyQuiz.getQuestionResponses.invalidate({ quizId, questionId });
            utils.facultyQuiz.getStudentResponses.invalidate({ quizId });
            toast("error", "Error saving", {
                description: err.message,
            });
        },
    });

    const question = data?.question;
    const responses = data?.responses ?? [];
    const total = data?.total ?? 0;
    const pageCount = Math.ceil(total / pageSize);

    // Get evaluation results for a student (local if edited, otherwise from server)
    const getEvaluationResults = useCallback(
        (studentId: string, serverEvaluation: EvaluationData | null): EvaluationData | null => {
            return localEvaluations[studentId] ?? serverEvaluation;
        },
        [localEvaluations]
    );

    // Handle score edit
    const createEditHandler = useCallback(
        (studentId: string, serverEvaluation: EvaluationData | null) => {
            return (qId: string, newScore: number | null, newRemarks?: string) => {
                const evaluationResults = getEvaluationResults(studentId, serverEvaluation);
                if (!evaluationResults) return;

                // Capture previous evaluation state before optimistic update
                const previousEvaluation = localEvaluations[studentId] ?? serverEvaluation;

                const newResults: EvaluationData = {
                    ...evaluationResults,
                    data: {
                        ...evaluationResults.data,
                        [qId]: {
                            ...evaluationResults.data[qId],
                            status: "EVALUATED_MANUALLY",
                            mark: newScore ?? 0,
                            remarks: newRemarks,
                        },
                    },
                };

                // Store context for error recovery before mutating
                pendingMutationRef.current = {
                    studentId,
                    previousEvaluation,
                };

                // Optimistic update for immediate UI feedback
                setLocalEvaluations((prev) => ({
                    ...prev,
                    [studentId]: newResults,
                }));

                // Save to server
                updateMutation.mutate({
                    quizId,
                    studentId,
                    evaluationResults: newResults,
                });
            };
        },
        [getEvaluationResults, localEvaluations, quizId, updateMutation]
    );

    const handleBatchChange = (values: string[]) => {
        setSelectedBatchIds(values);
        setPageIndex(0);
    };

    const handleStudentSourceChange = (value: StudentSourceFilter) => {
        setStudentSourceFilter(value);
        if (value === "individual") {
            setSelectedBatchIds([]);
        }
        setPageIndex(0);
    };

    const handleSearch = (value: string) => {
        setSearchQuery(value);
        setPageIndex(0);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-48 w-full" />
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-64 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    if (!question) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-lg font-medium text-muted-foreground">Question not found</p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() =>
                            router.push(`/course/${courseId}/quiz/${quizId}/results?tab=questions`)
                        }
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Questions
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Question Responses</h1>
                    <p className="text-sm text-muted-foreground">
                        View all student responses for this question
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Award className="h-4 w-4 text-primary" />
                        Question ({question.marks} marks)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <QuestionRender
                        question={question as unknown as QuizQuestion}
                        showMetadata={true}
                        showSolution={true}
                        showExplanation={true}
                        isReadOnly={true}
                        compareWithStudentAnswer={false}
                    />
                </CardContent>
            </Card>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email, or ID..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select
                    value={studentSourceFilter}
                    onValueChange={(value) =>
                        handleStudentSourceChange(value as StudentSourceFilter)
                    }
                >
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Student source" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Students</SelectItem>
                        <SelectItem value="batch">By Batch Only</SelectItem>
                        <SelectItem value="individual">Individual Only</SelectItem>
                    </SelectContent>
                </Select>
                {studentSourceFilter !== "individual" && (
                    <DropdownMultiSelect
                        options={batchOptions}
                        selected={selectedBatchIds}
                        onChange={handleBatchChange}
                        allLabel="All Batches"
                        className="w-[200px]"
                        disabled={batchesLoading}
                    />
                )}
                <div className="ml-auto text-sm text-muted-foreground">
                    {total} {total === 1 ? "response" : "responses"}
                </div>
            </div>

            {responses.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-lg font-medium text-muted-foreground">
                            No responses found
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {searchQuery
                                ? "Try adjusting your search criteria"
                                : "No students have responded to this question yet"}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {responses.map((resp) => {
                        const serverEvaluation = resp.evaluationResults as EvaluationData | null;
                        const evaluationResults = getEvaluationResults(
                            resp.studentId,
                            serverEvaluation
                        );
                        const evaluation = getEvaluationStatus(questionId, evaluationResults);
                        const studentAnswerProps = getStudentAnswerProps(
                            questionId,
                            question.type,
                            resp.response as ResponseData | null
                        );

                        return (
                            <Card
                                key={resp.studentId}
                                className="overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center gap-4 pt-1 p-4 border-b">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={resp.profileImage || undefined} />
                                        <AvatarFallback>
                                            {resp.studentName
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")
                                                .toUpperCase()
                                                .slice(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">
                                            {resp.studentName}
                                        </div>
                                        <div className="text-sm text-muted-foreground truncate">
                                            {resp.profileId} • {resp.studentEmail}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <EvaluationBadge status={evaluation.status} />
                                        {evaluation.mark !== null && (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-linear-to-r from-primary/10 to-primary/5 border border-primary/20">
                                                <Award className="h-4 w-4 text-primary" />
                                                <span className="font-semibold text-primary">
                                                    {evaluation.mark}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    / {question.marks}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <CardContent className="p-4">
                                    <QuestionRender
                                        question={question as unknown as QuizQuestion}
                                        showMetadata={false}
                                        showSolution={false}
                                        showExplanation={false}
                                        isReadOnly={true}
                                        compareWithStudentAnswer={true}
                                        studentScore={evaluation.mark ?? undefined}
                                        evaluationStatus={evaluation.status}
                                        remarks={evaluation.remarks}
                                        onEditScore={createEditHandler(
                                            resp.studentId,
                                            serverEvaluation
                                        )}
                                        {...studentAnswerProps}
                                    />
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {pageCount > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Page {pageIndex + 1} of {pageCount}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                            disabled={pageIndex === 0}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
                            disabled={pageIndex >= pageCount - 1}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function EvaluationBadge({ status }: { status: EvaluationStatus }) {
    switch (status) {
        case "EVALUATED":
            return (
                <Badge
                    variant="outline"
                    className={cn(
                        "gap-1",
                        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    )}
                >
                    <CheckCircle2 className="h-3 w-3" />
                    Evaluated
                </Badge>
            );
        case "EVALUATED_MANUALLY":
            return (
                <Badge
                    variant="outline"
                    className={cn(
                        "gap-1",
                        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    )}
                >
                    <CheckCircle2 className="h-3 w-3" />
                    Manual
                </Badge>
            );
        default:
            return (
                <Badge
                    variant="outline"
                    className={cn(
                        "gap-1",
                        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                    )}
                >
                    <XCircle className="h-3 w-3" />
                    Unevaluated
                </Badge>
            );
    }
}
