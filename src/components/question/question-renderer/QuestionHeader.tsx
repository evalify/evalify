import { Question } from "@/types/questions";
import { Badge } from "@/components/ui/badge";
import { ContentPreview } from "@/components/rich-text-editor/content-preview";
import { Card, CardContent } from "@/components/ui/card";
import { Award, BrainCircuit, Gauge, Target, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionHeaderProps {
    question: Question;
    questionNumber?: number;
    showMetadata?: boolean;
    className?: string;
}

export function QuestionHeader({
    question,
    questionNumber,
    showMetadata = true,
    className,
}: QuestionHeaderProps) {
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

    return (
        <Card className={cn("mb-6", className)}>
            <CardContent className="p-6">
                {/* Question Number and Type */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {questionNumber && (
                            <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                {questionNumber}
                            </div>
                        )}
                        <div>
                            <Badge variant="outline" className="text-xs">
                                {getQuestionTypeLabel(question.type)}
                            </Badge>
                        </div>
                    </div>

                    {/* Marks */}
                    <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-blue-600">
                            {question.marks} {question.marks === 1 ? "mark" : "marks"}
                        </span>
                        {question.negativeMarks > 0 && (
                            <Badge variant="destructive" className="text-xs">
                                -{question.negativeMarks}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Question Text */}
                <div className="mb-4">
                    <ContentPreview content={question.question} />
                </div>

                {/* Metadata */}
                {showMetadata && (
                    <div className="flex flex-wrap gap-2 pt-4 border-t">
                        {question.difficulty && (
                            <Badge
                                variant="outline"
                                className={cn("text-xs", getDifficultyColor(question.difficulty))}
                            >
                                <Gauge className="h-3 w-3 mr-1" />
                                {question.difficulty}
                            </Badge>
                        )}

                        {question.bloomTaxonomyLevel && (
                            <Badge variant="outline" className="text-xs">
                                <BrainCircuit className="h-3 w-3 mr-1" />
                                {question.bloomTaxonomyLevel}
                            </Badge>
                        )}

                        {question.courseOutcome && (
                            <Badge variant="outline" className="text-xs">
                                <Target className="h-3 w-3 mr-1" />
                                {question.courseOutcome}
                            </Badge>
                        )}

                        {question.topics && question.topics.length > 0 && (
                            <>
                                {question.topics.map((topic) => (
                                    <Badge
                                        key={topic.topicId}
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        <Tags className="h-3 w-3 mr-1" />
                                        {topic.topicName}
                                    </Badge>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
