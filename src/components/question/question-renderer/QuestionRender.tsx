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
    X,
    Pencil,
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
    onEditScore?: (questionId: string, newScore: number | null) => void; // null to clear the score

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
    const [editedScore, setEditedScore] = useState<string>(
        studentScore !== null && studentScore !== undefined ? String(studentScore) : ""
    );

    const handleSaveScore = useCallback(() => {
        if (!question.id || !onEditScore) return;

        // Allow empty score (clearing the evaluation)
        if (editedScore.trim() === "") {
            onEditScore(question.id, null); // Signal to clear the score
            setIsEditingScore(false);
            return;
        }

        const numericScore = parseFloat(editedScore);
        if (isNaN(numericScore) || numericScore > question.marks) {
            // Invalid score, reset to original
            setEditedScore(
                studentScore !== null && studentScore !== undefined ? String(studentScore) : ""
            );
            setIsEditingScore(false);
            return;
        }

        onEditScore(question.id, numericScore);
        setIsEditingScore(false);
    }, [question.id, question.marks, onEditScore, editedScore, studentScore]);

    const handleCancelEdit = useCallback(() => {
        setEditedScore(
            studentScore !== null && studentScore !== undefined ? String(studentScore) : ""
        );
        setIsEditingScore(false);
    }, [studentScore]);
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

    return (
        <Card className={className}>
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
                                        <div className="flex items-center gap-1">
                                            {isEditingScore ? (
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        type="number"
                                                        value={editedScore}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            // Allow empty string (for clearing) or valid numbers up to max
                                                            if (val === "" || val === "-") {
                                                                setEditedScore(val);
                                                            } else {
                                                                const num = parseFloat(val);
                                                                if (
                                                                    !isNaN(num) &&
                                                                    num <= question.marks
                                                                ) {
                                                                    setEditedScore(val);
                                                                }
                                                            }
                                                        }}
                                                        className="h-6 w-14 text-xs px-1.5 text-center"
                                                        max={question.marks}
                                                        step="0.5"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter")
                                                                handleSaveScore();
                                                            if (e.key === "Escape")
                                                                handleCancelEdit();
                                                        }}
                                                    />
                                                    <span className="text-xs text-muted-foreground">
                                                        /
                                                    </span>
                                                    <span className="text-xs font-medium">
                                                        {question.marks}
                                                    </span>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-5 w-5 text-green-600 hover:text-green-700 hover:bg-green-100"
                                                        onClick={handleSaveScore}
                                                    >
                                                        <Check className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-5 w-5 text-destructive hover:bg-destructive/10"
                                                        onClick={handleCancelEdit}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            className={cn(
                                                                "flex items-center gap-1 px-1.5 py-0.5 rounded",
                                                                studentScore !== null &&
                                                                    studentScore !== undefined
                                                                    ? studentScore ===
                                                                      question.marks
                                                                        ? "bg-green-100 dark:bg-green-900/30"
                                                                        : studentScore === 0
                                                                          ? "bg-red-100 dark:bg-red-900/30"
                                                                          : "bg-yellow-100 dark:bg-yellow-900/30"
                                                                    : "bg-muted/50",
                                                                onEditScore &&
                                                                    "cursor-pointer hover:bg-muted"
                                                            )}
                                                            onClick={() =>
                                                                onEditScore &&
                                                                setIsEditingScore(true)
                                                            }
                                                        >
                                                            <span
                                                                className={cn(
                                                                    "font-semibold text-sm",
                                                                    studentScore !== null &&
                                                                        studentScore !== undefined
                                                                        ? studentScore ===
                                                                          question.marks
                                                                            ? "text-green-700 dark:text-green-400"
                                                                            : studentScore === 0
                                                                              ? "text-red-700 dark:text-red-400"
                                                                              : "text-yellow-700 dark:text-yellow-400"
                                                                        : "text-muted-foreground"
                                                                )}
                                                            >
                                                                {studentScore !== null &&
                                                                studentScore !== undefined
                                                                    ? studentScore
                                                                    : "—"}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                /
                                                            </span>
                                                            <span className="text-xs font-medium">
                                                                {question.marks}
                                                            </span>
                                                            {onEditScore && (
                                                                <Pencil className="h-2.5 w-2.5 ml-0.5 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>
                                                            {studentScore !== null &&
                                                            studentScore !== undefined
                                                                ? `Score: ${studentScore}/${question.marks}`
                                                                : "Not evaluated yet"}
                                                            {onEditScore && " (Click to edit)"}
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </div>
                                    )}
                                    {/* Question Marks (only show separately if no student score) */}
                                    {studentScore === undefined && !onEditScore && (
                                        <div className="flex items-center gap-1">
                                            <Award className="h-3.5 w-3.5 text-blue-600" />
                                            <span className="font-semibold text-blue-600 text-sm">
                                                {question.marks}
                                            </span>
                                            {question.negativeMarks > 0 && (
                                                <span className="text-[10px] text-destructive">
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
            </CardContent>
        </Card>
    );
}
