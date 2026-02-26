import { MCQQuestion } from "@/types/questions";
import { ContentPreview } from "@/components/rich-text-editor/content-preview";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MCQRendererProps {
    question: MCQQuestion;
    showSolution?: boolean;
    selectedOptionId?: string;
    onOptionSelect?: (optionId: string) => void;
    isReadOnly?: boolean;
    compareWithStudentAnswer?: boolean;
}

export function MCQRenderer({
    question,
    showSolution = false,
    selectedOptionId,
    onOptionSelect,
    isReadOnly = false,
    compareWithStudentAnswer = true,
}: MCQRendererProps) {
    const getOptionStatus = (optionId: string) => {
        if (!showSolution) return null;

        const isCorrect = (question.solution?.correctOptions ?? []).some(
            (opt) => opt.id === optionId && opt.isCorrect
        );

        // If not comparing with student answer, just show correct answers
        if (!compareWithStudentAnswer) {
            return isCorrect ? "correct" : null;
        }

        const isSelected = selectedOptionId === optionId;

        if (isCorrect) return "correct";
        if (isSelected && !isCorrect) return "incorrect";
        return null;
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                {question.questionData?.options
                    ?.sort((a, b) => a.orderIndex - b.orderIndex)
                    ?.map((option) => {
                        const status = getOptionStatus(option.id);
                        const isSelected = selectedOptionId === option.id;

                        return (
                            <Card
                                key={option.id}
                                className={cn(
                                    "py-0 transition-all cursor-pointer hover:border-primary/50",
                                    isSelected && "border-primary bg-primary/5",
                                    status === "correct" &&
                                        "border-green-500 bg-green-50 dark:bg-green-950",
                                    status === "incorrect" &&
                                        "border-red-500 bg-red-50 dark:bg-red-950",
                                    isReadOnly && "cursor-default"
                                )}
                                onClick={() => {
                                    if (!isReadOnly && onOptionSelect) {
                                        onOptionSelect(option.id);
                                    }
                                }}
                            >
                                <CardContent className="p-3">
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 mt-0.5">
                                            <div
                                                className={cn(
                                                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                                    isSelected && "border-primary bg-primary",
                                                    status === "correct" &&
                                                        "border-green-600 bg-green-600",
                                                    status === "incorrect" &&
                                                        "border-red-600 bg-red-600",
                                                    !isSelected && !status && "border-gray-300"
                                                )}
                                            >
                                                {isSelected && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <ContentPreview content={option.optionText} noProse />
                                        </div>
                                        {status && (
                                            <Badge
                                                variant={
                                                    status === "correct" ? "default" : "destructive"
                                                }
                                                className="shrink-0"
                                            >
                                                {status === "correct" ? "Correct" : "Wrong"}
                                            </Badge>
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
