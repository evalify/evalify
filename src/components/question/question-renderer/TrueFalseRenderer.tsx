import { TrueFalseQuestion } from "@/types/questions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TrueFalseRendererProps {
    question: TrueFalseQuestion;
    showSolution?: boolean;
    selectedAnswer?: boolean;
    onAnswerSelect?: (answer: boolean) => void;
    isReadOnly?: boolean;
    compareWithStudentAnswer?: boolean;
}

export function TrueFalseRenderer({
    question,
    showSolution = false,
    selectedAnswer,
    onAnswerSelect,
    isReadOnly = false,
    compareWithStudentAnswer = true,
}: TrueFalseRendererProps) {
    const getOptionStatus = (value: boolean) => {
        if (!showSolution || question.trueFalseAnswer === undefined) return null;

        const isCorrect = question.trueFalseAnswer === value;

        // If not comparing with student answer, just show correct answer
        if (!compareWithStudentAnswer) {
            return isCorrect ? "correct" : null;
        }

        const isSelected = selectedAnswer === value;

        if (isCorrect) return "correct";
        if (isSelected && !isCorrect) return "incorrect";
        return null;
    };

    const renderOption = (value: boolean, label: string) => {
        const status = getOptionStatus(value);
        const isSelected = selectedAnswer === value;

        return (
            <Card
                className={cn(
                    "transition-all cursor-pointer hover:border-primary/50",
                    isSelected && "border-primary bg-primary/5",
                    status === "correct" && "border-green-500 bg-green-50 dark:bg-green-950",
                    status === "incorrect" && "border-red-500 bg-red-50 dark:bg-red-950",
                    isReadOnly && "cursor-default"
                )}
                onClick={() => {
                    if (!isReadOnly && onAnswerSelect) {
                        onAnswerSelect(value);
                    }
                }}
            >
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                    isSelected && "border-primary bg-primary",
                                    status === "correct" && "border-green-600 bg-green-600",
                                    status === "incorrect" && "border-red-600 bg-red-600",
                                    !isSelected && !status && "border-gray-300"
                                )}
                            >
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <span className="font-medium">{label}</span>
                        </div>
                        {status && (
                            <Badge variant={status === "correct" ? "default" : "destructive"}>
                                {status === "correct" ? "Correct" : "Wrong"}
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-3">
            {renderOption(true, "True")}
            {renderOption(false, "False")}
        </div>
    );
}
