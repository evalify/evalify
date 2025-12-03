import { DescriptiveQuestion } from "@/types/questions";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ContentPreview } from "@/components/rich-text-editor/content-preview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface DescriptiveRendererProps {
    question: DescriptiveQuestion;
    showSolution?: boolean;
    answer?: string;
    onAnswerChange?: (value: string) => void;
    isReadOnly?: boolean;
    compareWithStudentAnswer?: boolean;
}

export function DescriptiveRenderer({
    question,
    showSolution = false,
    answer = "",
    onAnswerChange,
    isReadOnly = false,
}: DescriptiveRendererProps) {
    const safeAnswer = typeof answer === "string" ? answer : "";
    const wordCount = safeAnswer.trim().split(/\s+/).filter(Boolean).length;
    const minWords = question.descriptiveConfig?.minWords;
    const maxWords = question.descriptiveConfig?.maxWords;

    const isWithinWordLimit =
        (!minWords || wordCount >= minWords) && (!maxWords || wordCount <= maxWords);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 mb-4">
                {minWords && <Badge variant="outline">Min {minWords} words</Badge>}
                {maxWords && <Badge variant="outline">Max {maxWords} words</Badge>}
                {question.descriptiveConfig?.keywords &&
                    question.descriptiveConfig.keywords.length > 0 && (
                        <Badge variant="secondary">
                            {question.descriptiveConfig.keywords.length} keywords expected
                        </Badge>
                    )}
            </div>

            <div className="space-y-3">
                <Textarea
                    value={safeAnswer}
                    onChange={(e) => onAnswerChange?.(e.target.value)}
                    disabled={isReadOnly}
                    placeholder="Type your answer here..."
                    className="min-h-[200px] resize-y"
                />

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                        Word count:{" "}
                        <span
                            className={
                                !isWithinWordLimit && (minWords || maxWords)
                                    ? "text-red-600 font-medium"
                                    : "font-medium"
                            }
                        >
                            {wordCount}
                        </span>
                    </span>
                    {!isWithinWordLimit && (minWords || maxWords) && (
                        <span className="text-red-600 text-xs">
                            {wordCount < (minWords || 0)
                                ? `Need ${(minWords || 0) - wordCount} more words`
                                : `Exceeded by ${wordCount - (maxWords || 0)} words`}
                        </span>
                    )}
                </div>
            </div>

            {showSolution && question.descriptiveConfig?.modelAnswer && (
                <Card className="mt-6 border-green-500/50 bg-green-50 dark:bg-green-950">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-5 w-5 text-green-600" />
                            Model Answer
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ContentPreview
                            content={question.descriptiveConfig.modelAnswer}
                            className="border-none"
                        />
                    </CardContent>
                </Card>
            )}

            {showSolution &&
                question.descriptiveConfig?.keywords &&
                question.descriptiveConfig.keywords.length > 0 && (
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle className="text-sm">Expected Keywords</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {question.descriptiveConfig.keywords.map((keyword, index) => (
                                    <Badge key={index} variant="secondary">
                                        {keyword}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
        </div>
    );
}
