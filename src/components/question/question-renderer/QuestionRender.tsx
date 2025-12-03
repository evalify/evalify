import { Question, QuestionType } from "@/types/questions";
import { QuestionExplanation } from "./QuestionExplanation";
import { MCQRenderer } from "./MCQRenderer";
import { MMCQRenderer } from "./MMCQRenderer";
import { TrueFalseRenderer } from "./TrueFalseRenderer";
import { FillInBlanksRenderer } from "./FillInBlanksRenderer";
import { MatchingRenderer } from "./MatchingRenderer";
import { DescriptiveRenderer } from "./DescriptiveRenderer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ContentPreview } from "@/components/rich-text-editor/content-preview";
import {
    AlertCircle,
    Award,
    BrainCircuit,
    Edit2,
    Gauge,
    Target,
    Tags,
    Trash2,
    BookOpen,
    Check,
    Pencil,
    CheckCircle,
    Circle,
    MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";

export interface QuestionRenderProps {
    question: Question;
    questionNumber?: number;
    showMetadata?: boolean;
    showSolution?: boolean;
    showExplanation?: boolean;
    isReadOnly?: boolean;
    className?: string;
    compareWithStudentAnswer?: boolean; // If false, just show solutions without comparing to student answers

    studentScore?: number | null; // The score awarded to the student (null if not evaluated)
    evaluationStatus?: "UNEVALUATED" | "EVALUATED" | "EVALUATED_MANUALLY"; // The evaluation status from results JSON
    remarks?: string; // Optional remarks for the evaluation
    onEditScore?: (questionId: string, newScore: number | null, remarks?: string) => void; // null to clear the score

    // Actions
    onEdit?: (questionId: string) => void;
    onDelete?: (questionId: string) => void;

    // MCQ/MMCQ props
    selectedOptionId?: string;
    selectedOptionIds?: string[];
    onOptionSelect?: (optionId: string) => void;
    onOptionToggle?: (optionId: string) => void;

    // True/False props
    selectedAnswer?: boolean;
    onAnswerSelect?: (answer: boolean) => void;

    // Fill in Blanks props
    blankAnswers?: Record<number, string>;
    onBlankAnswerChange?: (blankIndex: number, value: string) => void;

    // Matching props
    matches?: Record<string, string>;
    onMatchChange?: (leftId: string, rightId: string) => void;

    // Descriptive props
    descriptiveAnswer?: string;
    onDescriptiveAnswerChange?: (value: string) => void;
}

export default function QuestionRender({
    question,
    questionNumber,
    showMetadata = true,
    showSolution = false,
    showExplanation = false,
    isReadOnly = false,
    className,
    compareWithStudentAnswer = true,
    studentScore,
    evaluationStatus,
    remarks,
    onEditScore,
    onEdit,
    onDelete,
    selectedOptionId,
    selectedOptionIds,
    onOptionSelect,
    onOptionToggle,
    selectedAnswer,
    onAnswerSelect,
    blankAnswers,
    onBlankAnswerChange,
    matches,
    onMatchChange,
    descriptiveAnswer,
    onDescriptiveAnswerChange,
}: QuestionRenderProps) {
    const [isEditingScore, setIsEditingScore] = useState(false);
    const [isEditingRemarks, setIsEditingRemarks] = useState(false);
    const [editedScore, setEditedScore] = useState<string>(
        studentScore !== null && studentScore !== undefined ? String(studentScore) : ""
    );
    const [editedRemarks, setEditedRemarks] = useState<string>(remarks || "");

    const handleSaveScore = useCallback(() => {
        if (!question.id || !onEditScore) return;

        // Allow empty score (clearing the evaluation)
        if (editedScore.trim() === "") {
            onEditScore(question.id, null, editedRemarks || undefined); // Signal to clear the score
            setIsEditingScore(false);
            return;
        }

        const numericScore = parseFloat(editedScore);
        const minScore = -(question.negativeMarks || 0);
        if (isNaN(numericScore) || numericScore > question.marks || numericScore < minScore) {
            // Invalid score, reset to original
            setEditedScore(
                studentScore !== null && studentScore !== undefined ? String(studentScore) : ""
            );
            setIsEditingScore(false);
            return;
        }

        onEditScore(question.id, numericScore, editedRemarks || undefined);
        setIsEditingScore(false);
    }, [
        question.id,
        question.marks,
        question.negativeMarks,
        onEditScore,
        editedScore,
        editedRemarks,
        studentScore,
    ]);

    const handleSaveRemarks = useCallback(() => {
        if (!question.id || !onEditScore) return;
        onEditScore(question.id, studentScore ?? null, editedRemarks || undefined);
        setIsEditingRemarks(false);
    }, [question.id, onEditScore, studentScore, editedRemarks]);

    const handleCancelEdit = useCallback(() => {
        setEditedScore(
            studentScore !== null && studentScore !== undefined ? String(studentScore) : ""
        );
        setIsEditingScore(false);
    }, [studentScore]);

    const handleCancelRemarks = useCallback(() => {
        setEditedRemarks(remarks || "");
        setIsEditingRemarks(false);
    }, [remarks]);
    const renderQuestionContent = () => {
        // Add error boundary for incomplete question data
        if (!question || !question.type) {
            return (
                <div className="p-4 text-center text-muted-foreground">
                    <p>Question data is incomplete or invalid</p>
                </div>
            );
        }

        switch (question.type) {
            case QuestionType.MCQ:
                return (
                    <MCQRenderer
                        question={question}
                        showSolution={showSolution}
                        selectedOptionId={selectedOptionId}
                        onOptionSelect={onOptionSelect}
                        isReadOnly={isReadOnly}
                        compareWithStudentAnswer={compareWithStudentAnswer}
                    />
                );

            case QuestionType.MMCQ:
                return (
                    <MMCQRenderer
                        question={question}
                        showSolution={showSolution}
                        selectedOptionIds={selectedOptionIds}
                        onOptionToggle={onOptionToggle}
                        isReadOnly={isReadOnly}
                        compareWithStudentAnswer={compareWithStudentAnswer}
                    />
                );

            case QuestionType.TRUE_FALSE:
                return (
                    <TrueFalseRenderer
                        question={question}
                        showSolution={showSolution}
                        selectedAnswer={selectedAnswer}
                        onAnswerSelect={onAnswerSelect}
                        isReadOnly={isReadOnly}
                        compareWithStudentAnswer={compareWithStudentAnswer}
                    />
                );

            case QuestionType.FILL_THE_BLANK:
                return (
                    <FillInBlanksRenderer
                        question={question}
                        showSolution={showSolution}
                        answers={blankAnswers}
                        onAnswerChange={onBlankAnswerChange}
                        isReadOnly={isReadOnly}
                        compareWithStudentAnswer={compareWithStudentAnswer}
                    />
                );

            case QuestionType.MATCHING:
                return (
                    <MatchingRenderer
                        question={question}
                        showSolution={showSolution}
                        matches={matches}
                        onMatchChange={onMatchChange}
                        isReadOnly={isReadOnly}
                        compareWithStudentAnswer={compareWithStudentAnswer}
                    />
                );

            case QuestionType.DESCRIPTIVE:
                return (
                    <DescriptiveRenderer
                        question={question}
                        showSolution={showSolution}
                        answer={descriptiveAnswer}
                        onAnswerChange={onDescriptiveAnswerChange}
                        isReadOnly={isReadOnly}
                        compareWithStudentAnswer={compareWithStudentAnswer}
                    />
                );

            case QuestionType.CODING:
            case QuestionType.FILE_UPLOAD:
                return (
                    <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                                <AlertCircle className="h-5 w-5" />
                                <span className="font-medium">
                                    {question.type} questions are not yet supported in this renderer
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                );

            default:
                return (
                    <Card className="border-red-500/50 bg-red-50 dark:bg-red-950">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                                <AlertCircle className="h-5 w-5" />
                                <span className="font-medium">Unknown question type</span>
                            </div>
                        </CardContent>
                    </Card>
                );
        }
    };

    const getDifficultyColor = (difficulty?: string) => {
        switch (difficulty) {
            case "EASY":
                return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950";
            case "MEDIUM":
                return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-950";
            case "HARD":
                return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950";
            default:
                return "";
        }
    };

    const getQuestionTypeLabel = (type: string) => {
        switch (type) {
            case "MCQ":
                return "Single Choice";
            case "MMCQ":
                return "Multiple Choice";
            case "TRUE_FALSE":
                return "True/False";
            case "FILL_THE_BLANK":
                return "Fill in the Blanks";
            case "MATCHING":
                return "Match the Following";
            case "DESCRIPTIVE":
                return "Descriptive";
            case "CODING":
                return "Coding";
            case "FILE_UPLOAD":
                return "File Upload";
            default:
                return type;
        }
    };

    // Extract bank name for type safety
    const bankName = "bankName" in question ? (question.bankName as string | null) : null;

    // Determine if question is evaluated (based on evaluationStatus prop from results JSON)
    const isEvaluated = onEditScore && evaluationStatus && evaluationStatus !== "UNEVALUATED";

    return (
        <Card
            className={cn(
                className,
                isEvaluated && "border-2 border-green-500/50 bg-green-50/30 dark:bg-green-950/20"
            )}
        >
            <CardContent className="p-4">
                {/* Compact Header Section */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                        {questionNumber && (
                            <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-sm">
                                {questionNumber}
                            </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-2">
                            {/* Compact metadata badges */}
                            <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                                    {getQuestionTypeLabel(question.type)}
                                </Badge>
                                {/* Evaluation status badge - only show when in evaluation mode */}
                                {onEditScore && (
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[10px] px-1.5 py-0 h-5 gap-0.5",
                                            evaluationStatus === "EVALUATED_MANUALLY"
                                                ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700"
                                                : evaluationStatus === "EVALUATED"
                                                  ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700"
                                                  : "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700"
                                        )}
                                    >
                                        {evaluationStatus === "EVALUATED_MANUALLY" ? (
                                            <>
                                                <Pencil className="h-2.5 w-2.5" />
                                                Manually Evaluated
                                            </>
                                        ) : evaluationStatus === "EVALUATED" ? (
                                            <>
                                                <CheckCircle className="h-2.5 w-2.5" />
                                                Auto Evaluated
                                            </>
                                        ) : (
                                            <>
                                                <Circle className="h-2.5 w-2.5" />
                                                Not Evaluated
                                            </>
                                        )}
                                    </Badge>
                                )}
                                {showMetadata && question.difficulty && (
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[10px] px-1.5 py-0 h-5",
                                            getDifficultyColor(question.difficulty)
                                        )}
                                    >
                                        <Gauge className="h-2.5 w-2.5 mr-0.5" />
                                        {question.difficulty}
                                    </Badge>
                                )}
                                {showMetadata && question.bloomTaxonomyLevel && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] px-1.5 py-0 h-5"
                                    >
                                        <BrainCircuit className="h-2.5 w-2.5 mr-0.5" />
                                        {question.bloomTaxonomyLevel}
                                    </Badge>
                                )}
                                {showMetadata && question.courseOutcome && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] px-1.5 py-0 h-5"
                                    >
                                        <Target className="h-2.5 w-2.5 mr-0.5" />
                                        {question.courseOutcome}
                                    </Badge>
                                )}
                                {showMetadata && bankName && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge
                                                variant="secondary"
                                                className="text-[10px] px-1.5 py-0 h-5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                                            >
                                                <BookOpen className="h-2.5 w-2.5 mr-0.5" />
                                                {bankName}
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Imported from question bank</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                                <div className="flex items-center gap-2 ml-auto">
                                    {(studentScore !== undefined || onEditScore) && (
                                        <div
                                            className={cn(
                                                "flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 shadow-sm transition-all",
                                                isEvaluated
                                                    ? studentScore === question.marks
                                                        ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 dark:from-green-950/50 dark:to-emerald-950/50 dark:border-green-700"
                                                        : "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 dark:from-amber-950/50 dark:to-yellow-950/50 dark:border-amber-700"
                                                    : "bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200 dark:from-slate-900/50 dark:to-gray-900/50 dark:border-slate-700"
                                            )}
                                        >
                                            <Award
                                                className={cn(
                                                    "h-3.5 w-3.5",
                                                    isEvaluated
                                                        ? studentScore === question.marks
                                                            ? "text-green-600 dark:text-green-400"
                                                            : "text-amber-600 dark:text-amber-400"
                                                        : "text-slate-400 dark:text-slate-500"
                                                )}
                                            />
                                            <span
                                                className={cn(
                                                    "font-bold text-sm tabular-nums",
                                                    isEvaluated
                                                        ? studentScore === question.marks
                                                            ? "text-green-700 dark:text-green-300"
                                                            : "text-amber-700 dark:text-amber-300"
                                                        : "text-slate-500 dark:text-slate-400"
                                                )}
                                            >
                                                {isEvaluated ? studentScore : "—"}
                                            </span>
                                            <span className="text-xs text-muted-foreground font-medium">
                                                /
                                            </span>
                                            <span className="text-xs font-semibold text-foreground">
                                                {question.marks}
                                            </span>
                                        </div>
                                    )}
                                    {/* Question Marks (only show separately if no student score) */}
                                    {studentScore === undefined && !onEditScore && (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 dark:border-blue-800 shadow-sm">
                                            <Award className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                            <span className="font-bold text-blue-700 dark:text-blue-300 text-sm tabular-nums">
                                                {question.marks}
                                            </span>
                                            {question.negativeMarks > 0 && (
                                                <span className="text-[10px] font-medium text-red-500 dark:text-red-400">
                                                    (-{question.negativeMarks})
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Question Text */}
                            <div className="prose dark:prose-invert max-w-none prose-sm">
                                <ContentPreview content={question.question} />
                            </div>

                            {/* Topics - more compact */}
                            {showMetadata && question.topics && question.topics.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {question.topics.map((topic) => (
                                        <Badge
                                            key={`${question.id}-${topic.topicId}`}
                                            variant="secondary"
                                            className="text-[10px] px-1.5 py-0 h-5"
                                        >
                                            <Tags className="h-2.5 w-2.5 mr-0.5" />
                                            {topic.topicName}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Compact Actions */}
                    {(onEdit || onDelete) && (
                        <div className="flex gap-0.5 shrink-0">
                            {onEdit && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={() => question.id && onEdit(question.id)}
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Edit question</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            {onDelete && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                            onClick={() => question.id && onDelete(question.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Delete question</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    )}
                </div>

                {/* Answer Section */}
                <div className="border-t pt-3">{renderQuestionContent()}</div>

                {/* Explanation */}
                {showExplanation && question.explanation && (
                    <div className="mt-3 pt-3 border-t">
                        <QuestionExplanation explanation={question.explanation} />
                    </div>
                )}

                {/* Evaluation Section - only show when in evaluation mode */}
                {onEditScore && (
                    <div className="mt-3 pt-3 border-t space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                                Evaluation
                            </span>
                            {!isEditingScore && !isEditingRemarks && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs gap-1"
                                        onClick={() => setIsEditingScore(true)}
                                    >
                                        <Pencil className="h-3 w-3" />
                                        Edit Marks
                                    </Button>
                                    {!remarks && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs gap-1 text-muted-foreground"
                                            onClick={() => setIsEditingRemarks(true)}
                                        >
                                            <MessageSquare className="h-3 w-3" />
                                            Add Remarks
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Edit Score Section */}
                        {isEditingScore && (
                            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Score:</span>
                                    <Input
                                        type="number"
                                        value={editedScore}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const minScore = -(question.negativeMarks || 0);

                                            // Handle empty or just minus sign
                                            if (val === "" || val === "-") {
                                                setEditedScore(val);
                                                return;
                                            }

                                            // Parse the number and validate
                                            const num = parseFloat(val);
                                            if (
                                                !isNaN(num) &&
                                                num <= question.marks &&
                                                num >= minScore
                                            ) {
                                                // Use the parsed number to remove leading zeros
                                                setEditedScore(String(num));
                                            }
                                        }}
                                        className="h-8 w-20 text-sm text-center"
                                        min={-(question.negativeMarks || 0)}
                                        max={question.marks}
                                        step="0.5"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSaveScore();
                                            if (e.key === "Escape") handleCancelEdit();
                                        }}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        / {question.marks}
                                    </span>
                                    {question.negativeMarks > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                            (min: -{question.negativeMarks})
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 ml-auto">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs"
                                        onClick={handleCancelEdit}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={handleSaveScore}
                                    >
                                        <Check className="h-3 w-3 mr-1" />
                                        Save
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Edit Remarks Section */}
                        {isEditingRemarks && (
                            <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                                <Textarea
                                    value={editedRemarks}
                                    onChange={(e) => setEditedRemarks(e.target.value)}
                                    placeholder="Add remarks or feedback for this answer..."
                                    className="min-h-20 text-sm resize-none"
                                    autoFocus
                                />
                                <div className="flex items-center gap-1 justify-end">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs"
                                        onClick={handleCancelRemarks}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={handleSaveRemarks}
                                    >
                                        <Check className="h-3 w-3 mr-1" />
                                        Save Remarks
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Show existing remarks */}
                        {remarks && !isEditingRemarks && (
                            <div className="p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2">
                                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                                        <div>
                                            <span className="text-xs font-medium text-muted-foreground">
                                                Remarks
                                            </span>
                                            <p className="text-sm mt-1">{remarks}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => setIsEditingRemarks(true)}
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
