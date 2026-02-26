import { MMCQQuestion } from "@/types/questions";
import { ContentPreview } from "@/components/rich-text-editor/content-preview";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface MMCQRendererProps {
    question: MMCQQuestion;
    showSolution?: boolean;
    selectedOptionIds?: string[];
    onOptionToggle?: (optionId: string) => void;
    isReadOnly?: boolean;
    compareWithStudentAnswer?: boolean;
}

export function MMCQRenderer({
    question,
    showSolution = false,
    selectedOptionIds = [],
    onOptionToggle,
    isReadOnly = false,
    compareWithStudentAnswer = true,
}: MMCQRendererProps) {
    const getOptionStatus = (optionId: string) => {
        if (!showSolution) return null;

        const isCorrect = (question.solution?.correctOptions ?? []).some(
            (opt) => opt.id === optionId && opt.isCorrect
        );

        // If not comparing with student answer, just show correct answers
        if (!compareWithStudentAnswer) {
            return isCorrect ? "correct" : null;
        }

        const isSelected = selectedOptionIds.includes(optionId);

        if (isCorrect && isSelected) return "correct";
        if (isCorrect && !isSelected) return "missed";
        if (!isCorrect && isSelected) return "incorrect";
        return null;
    };

    return (
        <div className="space-y-4">
            <div className="mb-4">
                <Badge variant="outline" className="text-xs">
                    Multiple answers possible
                </Badge>
            </div>
            <div className="space-y-2">
                {question.questionData?.options
                    ?.sort((a, b) => a.orderIndex - b.orderIndex)
                    ?.map((option) => {
                        const status = getOptionStatus(option.id);
                        const isSelected = selectedOptionIds.includes(option.id);

                        return (
                            <Card
                                key={option.id}
                                className={cn(
                                    "py-0 transition-all cursor-pointer hover:border-primary/50",
                                    isSelected && "border-primary bg-primary/5",
                                    status === "correct" &&
                                        "border-green-500 bg-green-50 dark:bg-green-950",
                                    status === "missed" &&
                                        "border-yellow-500 bg-yellow-50 dark:bg-yellow-950",
                                    status === "incorrect" &&
                                        "border-red-500 bg-red-50 dark:bg-red-950",
                                    isReadOnly && "cursor-default"
                                )}
                                onClick={() => {
                                    if (!isReadOnly && onOptionToggle) {
                                        onOptionToggle(option.id);
                                    }
                                }}
                            >
                                <CardContent className="p-3">
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 mt-1">
                                            <div
                                                className={cn(
                                                    "w-5 h-5 rounded border-2 flex items-center justify-center",
                                                    isSelected && "border-primary bg-primary",
                                                    status === "correct" &&
                                                        "border-green-600 bg-green-600",
                                                    status === "missed" &&
                                                        "border-yellow-600 bg-yellow-600",
                                                    status === "incorrect" &&
                                                        "border-red-600 bg-red-600",
                                                    !isSelected && !status && "border-gray-300"
                                                )}
                                            >
                                                {isSelected && (
                                                    <Check className="w-3 h-3 text-white" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <ContentPreview content={option.optionText} noProse />
                                        </div>
                                        {status && (
                                            <Badge
                                                variant={
                                                    status === "correct"
                                                        ? "default"
                                                        : status === "missed"
                                                          ? "secondary"
                                                          : "destructive"
                                                }
                                                className="shrink-0"
                                            >
                                                {status === "correct"
                                                    ? "Correct"
                                                    : status === "missed"
                                                      ? "Missed"
                                                      : "Wrong"}
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
