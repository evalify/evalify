"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";
import QuizTimer from "./quiz-timer";
import { useQuizContext } from "./context/quiz-context";
import { cn } from "@/lib/utils";

export default function QuestionSidenav() {
    const ctx = useQuizContext();

    const displayQuestions = useMemo(() => {
        return ctx.sectionQuestions.map((q) => {
            const globalIndex = ctx.questions.findIndex((qq) => qq.id === q.id) + 1;
            const isAnswered = !!(q.response && Object.keys(q.response).length > 0);
            const isVisited = !!q._visited && !isAnswered;
            const isMarked = !!q._markedForReview;
            const isSelected = q.id === ctx.selectedQuestion;

            return {
                id: q.id,
                index: globalIndex,
                isAnswered,
                isVisited,
                isMarked,
                isSelected,
            };
        });
    }, [ctx.sectionQuestions, ctx.questions, ctx.selectedQuestion]);

    const stats = useMemo(() => ctx.getQuestionStats(), [ctx]);

    const handleQuestionClick = (questionId: string) => {
        ctx.setSelectedQuestion(questionId);
        ctx.markAsVisited(questionId);
    };

    const handleSectionClick = (sectionId: string) => {
        ctx.setSelectedQuestion(null);
        ctx.setSelectedSection(sectionId);
    };

    const getQuestionButtonClass = (q: (typeof displayQuestions)[0]) => {
        if (q.isSelected) {
            return "bg-blue-500 text-white hover:bg-blue-600 border-blue-600 dark:bg-blue-700 dark:hover:bg-blue-800";
        }
        if (q.isAnswered) {
            return "bg-green-500 text-white hover:bg-green-600 border-green-600 dark:bg-green-700 dark:hover:bg-green-800";
        }
        if (q.isMarked) {
            return "bg-yellow-500 text-black hover:bg-yellow-600 border-yellow-400 dark:bg-yellow-600 dark:hover:bg-yellow-400 dark:text-black";
        }
        if (q.isVisited) {
            return "bg-gray-400 text-white hover:bg-gray-500 border-gray-500 dark:bg-gray-700 dark:hover:bg-gray-800";
        }
        return "bg-background hover:bg-accent border-border dark:bg-slate-900 dark:hover:bg-slate-800";
    };

    return (
        <Card className="w-80 sticky top-4 h-[88vh] flex flex-col">
            <CardContent className="flex flex-col h-full p-4 gap-4 overflow-hidden">
                {/* Timer Section */}
                <div className="shrink-0">
                    <QuizTimer endTime={ctx.quizInfo?.endTime} />
                </div>

                {/* Sections Section */}
                {ctx.sections.length > 0 && (
                    <div className="shrink-0">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                            Sections
                        </div>
                        <ScrollArea className="h-14">
                            <div className="flex gap-2 px-1 pb-2">
                                {ctx.sections.map((s) => (
                                    <Button
                                        key={s.id}
                                        size="sm"
                                        variant={
                                            s.id === ctx.selectedSection ? "default" : "outline"
                                        }
                                        onClick={() => handleSectionClick(s.id)}
                                        className="whitespace-nowrap"
                                    >
                                        {s.name}
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}

                {/* Questions Grid Section - Scrollable */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-2 shrink-0">
                        <div className="text-xs font-medium text-muted-foreground">Questions</div>
                        <div className="text-xs text-muted-foreground">
                            {displayQuestions.length} Questions
                        </div>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="grid grid-cols-4 gap-1 pr-3">
                            {displayQuestions.map((q) => (
                                <Button
                                    key={q.id}
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleQuestionClick(q.id)}
                                    className={cn(
                                        "h-14 w-14 p-0 flex items-center justify-center relative border-2 transition-colors",
                                        getQuestionButtonClass(q)
                                    )}
                                >
                                    <span className="sr-only">Question {q.index}</span>
                                    <div className="text-sm font-medium">{q.index}</div>
                                    {q.isMarked && (
                                        <Flag className="absolute -top-1 -right-1 h-3 w-3 text-black dark:text-black" />
                                    )}
                                </Button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                {/* Statistics Section */}
                <div className="shrink-0 border-t pt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-sm bg-green-500 dark:bg-green-600" />
                            <span className="text-muted-foreground">Answered:</span>
                            <span className="font-medium">{stats.answered}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-sm bg-gray-400 dark:bg-gray-500" />
                            <span className="text-muted-foreground">Visited:</span>
                            <span className="font-medium">{stats.visited}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-sm bg-yellow-500 dark:bg-yellow-400" />
                            <span className="text-muted-foreground">Marked:</span>
                            <span className="font-medium">{stats.markedForReview}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-sm bg-background border border-border dark:bg-slate-800 dark:border-slate-700" />
                            <span className="text-muted-foreground">Unattempted:</span>
                            <span className="font-medium">{stats.unattempted}</span>
                        </div>
                    </div>
                    <div className="text-xs text-center pt-1 border-t">
                        <span className="text-muted-foreground">Total Questions:</span>{" "}
                        <span className="font-medium">{stats.total}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
