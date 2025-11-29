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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuestionRenderProps {
    question: Question;
    questionNumber?: number;
    showMetadata?: boolean;
    showSolution?: boolean;
    showExplanation?: boolean;
    isReadOnly?: boolean;
    className?: string;
    compareWithStudentAnswer?: boolean; // If false, just show solutions without comparing to student answers

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
            <CardContent className="p-6">
                {/* Header Section */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-4 flex-1">
                        {questionNumber && (
                            <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
                                {questionNumber}
                            </div>
                        )}
                        <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                    {getQuestionTypeLabel(question.type)}
                                </Badge>
                                {showMetadata && question.difficulty && (
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-xs",
                                            getDifficultyColor(question.difficulty)
                                        )}
                                    >
                                        <Gauge className="h-3 w-3 mr-1" />
                                        {question.difficulty}
                                    </Badge>
                                )}
                                {showMetadata && question.bloomTaxonomyLevel && (
                                    <Badge variant="outline" className="text-xs">
                                        <BrainCircuit className="h-3 w-3 mr-1" />
                                        {question.bloomTaxonomyLevel}
                                    </Badge>
                                )}
                                {showMetadata && question.courseOutcome && (
                                    <Badge variant="outline" className="text-xs">
                                        <Target className="h-3 w-3 mr-1" />
                                        {question.courseOutcome}
                                    </Badge>
                                )}
                                {showMetadata && bankName && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge
                                                variant="secondary"
                                                className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                                            >
                                                <BookOpen className="h-3 w-3 mr-1" />
                                                {bankName}
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Imported from question bank</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </div>

                            {/* Question Text */}
                            <div className="prose dark:prose-invert max-w-none">
                                <ContentPreview content={question.question} />
                            </div>

                            {/* Topics */}
                            {showMetadata && question.topics && question.topics.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {question.topics.map((topic) => (
                                        <Badge
                                            key={`${question.id}-${topic.topicId}`}
                                            variant="secondary"
                                            className="text-xs"
                                        >
                                            <Tags className="h-3 w-3 mr-1" />
                                            {topic.topicName}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions and Marks */}
                    <div className="flex flex-col items-end gap-2 ml-4">
                        {(onEdit || onDelete) && (
                            <div className="flex gap-1">
                                {onEdit && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8"
                                                onClick={() => question.id && onEdit(question.id)}
                                            >
                                                <Edit2 className="h-4 w-4" />
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
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => question.id && onDelete(question.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Delete question</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </div>
                        )}
                        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 px-3 py-2 rounded-lg">
                            <Award className="h-5 w-5 text-blue-600" />
                            <span className="font-bold text-blue-600 text-lg">
                                {question.marks}
                            </span>
                        </div>
                        {question.negativeMarks > 0 && (
                            <Badge variant="destructive" className="text-xs">
                                -{question.negativeMarks}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Answer Section */}
                <div className="border-t pt-6">{renderQuestionContent()}</div>

                {/* Explanation */}
                {showExplanation && question.explanation && (
                    <div className="mt-6 pt-6 border-t">
                        <QuestionExplanation explanation={question.explanation} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
