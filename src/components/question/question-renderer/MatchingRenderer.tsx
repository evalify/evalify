import { MatchTheFollowingQuestion } from "@/types/questions";
import { Card, CardContent } from "@/components/ui/card";
import { ContentPreview } from "@/components/rich-text-editor/content-preview";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { Check, X, Shuffle } from "lucide-react";

interface MatchingRendererProps {
    question: MatchTheFollowingQuestion;
    showSolution?: boolean;
    matches?: Record<string, string[]>;
    onMatchChange?: (leftId: string, rightIds: string[]) => void;
    isReadOnly?: boolean;
    compareWithStudentAnswer?: boolean;
}

export function MatchingRenderer({
    question,
    showSolution = false,
    matches = {},
    isReadOnly = false,
    compareWithStudentAnswer = true,
}: MatchingRendererProps) {
    const leftOptions = (question.options || [])
        .filter((opt) => opt.isLeft)
        .sort((a, b) => a.orderIndex - b.orderIndex);

    const rightOptions = (question.options || [])
        .filter((opt) => !opt.isLeft)
        .sort((a, b) => a.orderIndex - b.orderIndex);

    const getMatchStatus = (leftId: string, rightId: string) => {
        if (!showSolution) return null;

        const leftOption = (question.options || []).find((opt) => opt.id === leftId);
        if (!leftOption || !leftOption.matchPairIds) return null;

        const isCorrect = leftOption.matchPairIds.includes(rightId);

        // If not comparing with student answer, don't check selection
        if (!compareWithStudentAnswer) return null;

        const isSelected = matches[leftId]?.includes(rightId) ?? false;

        if (isCorrect && isSelected) return "correct";
        if (!isCorrect && isSelected) return "incorrect";
        return null;
    };

    const totalMatches = leftOptions.length;
    const completedMatches = leftOptions.filter(
        (opt) => matches[opt.id] && matches[opt.id].length > 0
    ).length;
    const correctMatches = leftOptions.filter((left) => {
        const selectedRightIds = matches[left.id] || [];
        const correctRightIds = left.matchPairIds || [];
        if (selectedRightIds.length === 0) return false;
        // Correct if the sets match exactly
        return (
            selectedRightIds.length === correctRightIds.length &&
            selectedRightIds.every((id) => correctRightIds.includes(id))
        );
    }).length;

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-3">
                    <Shuffle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Match the Following</span>
                    {!isReadOnly && (
                        <Badge
                            variant={completedMatches === totalMatches ? "default" : "secondary"}
                        >
                            {completedMatches}/{totalMatches} Matched
                        </Badge>
                    )}
                </div>
                {showSolution && compareWithStudentAnswer && completedMatches > 0 && (
                    <Badge variant={correctMatches === totalMatches ? "default" : "outline"}>
                        Score: {correctMatches}/{totalMatches}
                    </Badge>
                )}
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg border">
                        <div className="font-semibold text-sm">Column A</div>
                        <Badge variant="outline" className="text-xs">
                            {leftOptions.length} items
                        </Badge>
                    </div>
                    <div className="space-y-3">
                        {leftOptions.map((leftOption, index) => {
                            const selectedRightIds = matches[leftOption.id] || [];
                            const hasMatch = selectedRightIds.length > 0;
                            // Aggregate status: show correct only if ALL matches are correct
                            const statuses = selectedRightIds.map((rid) =>
                                getMatchStatus(leftOption.id, rid)
                            );
                            const status = hasMatch
                                ? statuses.every((s) => s === "correct")
                                    ? "correct"
                                    : statuses.some((s) => s === "incorrect")
                                      ? "incorrect"
                                      : null
                                : null;

                            return (
                                <Card
                                    key={leftOption.id}
                                    className={cn(
                                        "transition-all duration-200",
                                        hasMatch && "border-primary/50",
                                        status === "correct" &&
                                            "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
                                        status === "incorrect" &&
                                            "border-red-500/50 bg-red-50/50 dark:bg-red-950/20"
                                    )}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="flex items-center justify-center shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground font-semibold text-xs">
                                                {String.fromCharCode(65 + index)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <ContentPreview content={leftOption.text} noProse />
                                            </div>
                                            {status && (
                                                <div className="shrink-0">
                                                    {status === "correct" ? (
                                                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900">
                                                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900">
                                                            <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                                                        </div>
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

                {/* Right Column */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg border">
                        <div className="font-semibold text-sm">Column B</div>
                        <Badge variant="outline" className="text-xs">
                            {rightOptions.length} items
                        </Badge>
                    </div>
                    <div className="space-y-3">
                        {rightOptions.map((rightOption, index) => {
                            const isMatched = Object.values(matches).some((ids) =>
                                ids.includes(rightOption.id)
                            );

                            return (
                                <Card
                                    key={rightOption.id}
                                    className={cn(
                                        "transition-all duration-200",
                                        isMatched && "border-secondary/50 bg-secondary/5"
                                    )}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="flex items-center justify-center shrink-0 w-7 h-7 rounded-full bg-secondary text-secondary-foreground font-semibold text-xs">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <ContentPreview
                                                    content={rightOption.text}
                                                    noProse
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Solution Section */}
            {showSolution && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border-l-4 border-green-500">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-sm">Solution</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {leftOptions.map((leftOption, index) => {
                            const correctRightIds = leftOption.matchPairIds || [];
                            const correctMatchItems = rightOptions.filter((r) =>
                                correctRightIds.includes(r.id)
                            );
                            const selectedRightIds = matches[leftOption.id] || [];
                            const selectedMatchItems = rightOptions.filter((r) =>
                                selectedRightIds.includes(r.id)
                            );
                            const isFullyCorrect =
                                selectedRightIds.length === correctRightIds.length &&
                                selectedRightIds.every((id) => correctRightIds.includes(id));

                            return (
                                <Card
                                    key={leftOption.id}
                                    className={cn(
                                        "border-l-4",
                                        isFullyCorrect
                                            ? "border-l-green-500 bg-green-50/30 dark:bg-green-950/20"
                                            : selectedRightIds.length > 0
                                              ? "border-l-red-500 bg-red-50/30 dark:bg-red-950/20"
                                              : "border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/20"
                                    )}
                                >
                                    <CardContent className="p-4">
                                        <div className="space-y-3">
                                            {/* Question Item */}
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="shrink-0">
                                                    {String.fromCharCode(65 + index)}
                                                </Badge>
                                                <div className="text-sm font-medium flex-1">
                                                    <ContentPreview
                                                        content={leftOption.text}
                                                        noProse
                                                    />
                                                </div>
                                            </div>

                                            {/* User's Answers */}
                                            {selectedMatchItems.length > 0 && (
                                                <div
                                                    className={cn(
                                                        "flex flex-col gap-2 p-3 rounded-lg border",
                                                        isFullyCorrect
                                                            ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                                                            : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {isFullyCorrect ? (
                                                            <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                                                        ) : (
                                                            <X className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                                                        )}
                                                        <span
                                                            className={cn(
                                                                "text-xs font-medium",
                                                                isFullyCorrect
                                                                    ? "text-green-900 dark:text-green-200"
                                                                    : "text-red-900 dark:text-red-200"
                                                            )}
                                                        >
                                                            Your answer
                                                            {selectedMatchItems.length > 1
                                                                ? "s"
                                                                : ""}
                                                            :{" "}
                                                            {selectedMatchItems
                                                                .map(
                                                                    (r) =>
                                                                        rightOptions.indexOf(r) + 1
                                                                )
                                                                .join(", ")}
                                                        </span>
                                                    </div>
                                                    {selectedMatchItems.map((sm) => {
                                                        const isCorrectItem =
                                                            correctRightIds.includes(sm.id);
                                                        return (
                                                            <div
                                                                key={sm.id}
                                                                className={cn(
                                                                    "text-xs p-2 rounded bg-background/50 flex items-start gap-2",
                                                                    isCorrectItem
                                                                        ? "text-green-700 dark:text-green-300"
                                                                        : "text-red-700 dark:text-red-300"
                                                                )}
                                                            >
                                                                {isCorrectItem ? (
                                                                    <Check className="h-3 w-3 mt-0.5 shrink-0" />
                                                                ) : (
                                                                    <X className="h-3 w-3 mt-0.5 shrink-0" />
                                                                )}
                                                                <ContentPreview
                                                                    content={sm.text}
                                                                    noProse
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Correct Answer (shown when not fully correct or no answer) */}
                                            {(!isFullyCorrect ||
                                                selectedMatchItems.length === 0) && (
                                                <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                                                    <Check className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                                                    <div className="flex-1 space-y-2">
                                                        <div className="text-xs font-medium text-green-900 dark:text-green-200">
                                                            Correct answer
                                                            {correctMatchItems.length > 1
                                                                ? "s"
                                                                : ""}
                                                            :{" "}
                                                            {correctMatchItems
                                                                .map(
                                                                    (r) =>
                                                                        rightOptions.indexOf(r) + 1
                                                                )
                                                                .join(", ")}
                                                        </div>
                                                        <div className="space-y-2">
                                                            {correctMatchItems.map(
                                                                (correctMatch, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="text-xs p-2 rounded bg-background/50 text-green-700 dark:text-green-300"
                                                                    >
                                                                        <div className="flex items-start gap-2">
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="shrink-0 text-xs"
                                                                            >
                                                                                {rightOptions.indexOf(
                                                                                    correctMatch
                                                                                ) + 1}
                                                                            </Badge>
                                                                            <ContentPreview
                                                                                content={
                                                                                    correctMatch.text
                                                                                }
                                                                                noProse
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
