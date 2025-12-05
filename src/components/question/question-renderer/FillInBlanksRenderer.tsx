import { FillInBlanksQuestion } from "@/types/questions";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, X, AlertCircle, FileText, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface FillInBlanksRendererProps {
    question: FillInBlanksQuestion;
    showSolution?: boolean;
    answers?: Record<number, string>;
    onAnswerChange?: (blankIndex: number, value: string) => void;
    isReadOnly?: boolean;
    compareWithStudentAnswer?: boolean;
}

export function FillInBlanksRenderer({
    question,
    showSolution = false,
    answers = {},
    onAnswerChange,
    isReadOnly = false,
    compareWithStudentAnswer = true,
}: FillInBlanksRendererProps) {
    const checkAnswer = (blankIndex: number, userAnswer: string) => {
        if (!showSolution || !compareWithStudentAnswer) return null;
        if (!userAnswer || userAnswer.trim() === "") return null;

        const answerKey = blankIndex - 1;
        const acceptableAnswers = question.blankConfig?.acceptableAnswers?.[answerKey];
        if (!acceptableAnswers) return null;

        const normalized = userAnswer.trim().toLowerCase();
        const isCorrect = acceptableAnswers.answers.some(
            (ans) => ans.trim().toLowerCase() === normalized
        );

        return isCorrect;
    };

    // Return early if blankConfig is not available
    if (!question.blankConfig) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Fill in the blank configuration is missing</AlertDescription>
            </Alert>
        );
    }

    const totalBlanks = question.blankConfig.blankCount;
    const answeredBlanks = Object.values(answers).filter((a) => a && a.trim()).length;

    // Calculate score if showing solution
    let correctAnswers = 0;
    let totalScore = 0;
    let earnedScore = 0;

    if (showSolution && compareWithStudentAnswer) {
        for (let i = 0; i < totalBlanks; i++) {
            const blankIndex = i + 1;
            const userAnswer = answers[blankIndex] || "";
            const weight = question.blankConfig.blankWeights?.[i] || 1;
            totalScore += weight;

            if (checkAnswer(blankIndex, userAnswer)) {
                correctAnswers++;
                earnedScore += weight;
            }
        }
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <Card className="border-2">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                                <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Fill in the Blanks</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {totalBlanks} {totalBlanks === 1 ? "blank" : "blanks"} to
                                    complete
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {showSolution && compareWithStudentAnswer ? (
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "px-3 py-1.5 text-sm font-semibold",
                                            correctAnswers === totalBlanks
                                                ? "bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300"
                                                : correctAnswers > 0
                                                    ? "bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300"
                                                    : "bg-red-50 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300"
                                        )}
                                    >
                                        {correctAnswers}/{totalBlanks} Correct
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="px-3 py-1.5 text-sm font-semibold"
                                    >
                                        Score: {earnedScore}/{totalScore}
                                    </Badge>
                                </div>
                            ) : !isReadOnly ? (
                                <Badge
                                    variant={
                                        answeredBlanks === totalBlanks ? "default" : "secondary"
                                    }
                                    className="px-3 py-1.5"
                                >
                                    {answeredBlanks}/{totalBlanks} Filled
                                </Badge>
                            ) : null}
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Blanks Section */}
            <div className="space-y-4">
                {Array.from({ length: question.blankConfig.blankCount }, (_, i) => {
                    const blankIndex = i + 1;
                    const userAnswer = answers[blankIndex] || "";
                    const isCorrect = checkAnswer(blankIndex, userAnswer);
                    const answerKey = i;
                    const weight = question.blankConfig.blankWeights?.[answerKey] || 1;
                    const answerType = question.blankConfig.acceptableAnswers?.[answerKey]?.type;
                    const acceptableAnswers = question.blankConfig.acceptableAnswers?.[answerKey];

                    return (
                        <Card
                            key={blankIndex}
                            className={cn(
                                "transition-all duration-200",
                                showSolution &&
                                compareWithStudentAnswer &&
                                isCorrect !== null &&
                                (isCorrect
                                    ? "border-green-500/60 shadow-sm"
                                    : "border-red-500/60 shadow-sm")
                            )}
                        >
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    {/* Blank Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-linear-to-br from-primary/20 to-primary/10 text-primary font-bold text-sm border border-primary/20">
                                                #{blankIndex}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {weight !== 1 && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs font-semibold"
                                                    >
                                                        {weight} {weight === 1 ? "mark" : "marks"}
                                                    </Badge>
                                                )}
                                                {answerType && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs font-medium capitalize"
                                                    >
                                                        {answerType.toLowerCase()}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        {showSolution &&
                                            compareWithStudentAnswer &&
                                            isCorrect !== null && (
                                                <div
                                                    className={cn(
                                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold",
                                                        isCorrect
                                                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                                            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                                    )}
                                                >
                                                    {isCorrect ? (
                                                        <>
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            Correct
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle className="w-4 h-4" />
                                                            Incorrect
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                    </div>

                                    {/* Answer Input (Only if not showing solution or showing for reference) */}
                                    {!showSolution && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-muted-foreground">
                                                Your Answer
                                            </label>
                                            <Input
                                                value={userAnswer}
                                                onChange={(e) =>
                                                    onAnswerChange?.(blankIndex, e.target.value)
                                                }
                                                disabled={isReadOnly}
                                                placeholder="Enter your answer here..."
                                                className="h-11 text-base"
                                            />
                                        </div>
                                    )}

                                    {/* Solution Display */}
                                    {showSolution && (
                                        <div className="space-y-4">
                                            {/* User's Answer */}
                                            {compareWithStudentAnswer && (
                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                                        <div
                                                            className={cn(
                                                                "w-1.5 h-1.5 rounded-full",
                                                                isCorrect
                                                                    ? "bg-green-500"
                                                                    : userAnswer
                                                                        ? "bg-red-500"
                                                                        : "bg-gray-400"
                                                            )}
                                                        />
                                                        Your Answer
                                                    </label>
                                                    <div
                                                        className={cn(
                                                            "p-4 rounded-lg border-2 font-mono text-base",
                                                            isCorrect
                                                                ? "bg-green-50/50 border-green-300 text-green-900 dark:bg-green-950/20 dark:border-green-700 dark:text-green-100"
                                                                : userAnswer
                                                                    ? "bg-red-50/50 border-red-300 text-red-900 dark:bg-red-950/20 dark:border-red-700 dark:text-red-100"
                                                                    : "bg-gray-50 border-gray-300 text-gray-500 dark:bg-gray-900/20 dark:border-gray-700 italic"
                                                        )}
                                                    >
                                                        {userAnswer || "No answer provided"}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Separator */}
                                            {compareWithStudentAnswer && (
                                                <div className="relative">
                                                    <Separator />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="bg-background px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                            Correct Answer
                                                            {acceptableAnswers?.answers.length > 1
                                                                ? "s"
                                                                : ""}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Correct Answers */}
                                            <div className="space-y-2">
                                                {!compareWithStudentAnswer && (
                                                    <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                        Correct Answer
                                                        {acceptableAnswers?.answers.length > 1
                                                            ? "s"
                                                            : ""}
                                                    </label>
                                                )}
                                                <div className="space-y-2">
                                                    {acceptableAnswers?.answers.map(
                                                        (answer, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="group relative p-4 rounded-lg border-2 border-green-500 bg-linear-to-br from-green-50 via-emerald-50/50 to-green-50 dark:from-green-950/40 dark:via-emerald-950/20 dark:to-green-950/40 dark:border-green-600 transition-all hover:shadow-md"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="shrink-0 w-8 h-8 rounded-full bg-green-500 dark:bg-green-600 flex items-center justify-center shadow-sm">
                                                                        <Check className="h-4 w-4 text-white" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        {acceptableAnswers?.answers
                                                                            .length > 1 && (
                                                                                <Badge
                                                                                    variant="secondary"
                                                                                    className="mb-2 text-[10px] font-bold bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100 border-green-300 dark:border-green-700"
                                                                                >
                                                                                    Option {idx + 1}
                                                                                </Badge>
                                                                            )}
                                                                        <div className="font-mono text-base font-semibold text-green-900 dark:text-green-100 warp-break-words">
                                                                            {answer}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            {/* Feedback Message */}
                                            {compareWithStudentAnswer && (
                                                <Alert
                                                    className={cn(
                                                        "border-l-4",
                                                        isCorrect
                                                            ? "bg-green-50/50 border-green-500 dark:bg-green-950/20"
                                                            : !userAnswer
                                                                ? "bg-blue-50/50 border-blue-500 dark:bg-blue-950/20"
                                                                : "bg-red-50/50 border-red-500 dark:bg-red-950/20"
                                                    )}
                                                >
                                                    <AlertDescription
                                                        className={cn(
                                                            "text-sm font-medium",
                                                            isCorrect
                                                                ? "text-green-800 dark:text-green-200"
                                                                : !userAnswer
                                                                    ? "text-blue-800 dark:text-blue-200"
                                                                    : "text-red-800 dark:text-red-200"
                                                        )}
                                                    >
                                                        {isCorrect ? (
                                                            <span className="flex items-center gap-2">
                                                                <Check className="h-4 w-4 shrink-0" />
                                                                Excellent! Your answer is correct
                                                                and matches the expected response.
                                                            </span>
                                                        ) : !userAnswer ? (
                                                            <span className="flex items-center gap-2">
                                                                <AlertCircle className="h-4 w-4 shrink-0" />
                                                                {`You didn't provide an answer for
                                                                    this blank. Review the correct 
                                                                    ${acceptableAnswers?.answers
                                                                        .length > 1
                                                                        ? "answers"
                                                                        : "answer"
                                                                    }
                                                                    above.`}
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-2">
                                                                <X className="h-4 w-4 shrink-0" />
                                                                {`Your answer doesn't match the
                                                                expected response. Review the
                                                                correct 
                                                                ${acceptableAnswers?.answers
                                                                        .length > 1
                                                                        ? "answers"
                                                                        : "answer"
                                                                    } above.`}
                                                            </span>
                                                        )}
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
