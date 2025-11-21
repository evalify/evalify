"use client";

import React from "react";
import { useQuizContext } from "./context/quiz-context";
import QuestionSidenav from "./question-sidenav";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";

export default function QuizPageClient() {
    const { sanitizedQuestions, currentQuestion, toggleMarkForReview } = useQuizContext();

    const activeQuestion = sanitizedQuestions.find((q) => q.id === currentQuestion?.id);
    const activeIndex = activeQuestion
        ? sanitizedQuestions.findIndex((q) => q.id === activeQuestion.id) + 1
        : 0;

    const handleToggleMarkForReview = () => {
        if (currentQuestion?.id) {
            toggleMarkForReview(currentQuestion.id);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
            <main className="space-y-4">
                <h2 className="sr-only">Quiz Questions</h2>
                {activeQuestion ? (
                    <article className="space-y-4">
                        <div className="p-6 border rounded-lg shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Question {activeIndex}</h3>
                                <Button
                                    variant={
                                        currentQuestion?._markedForReview ? "default" : "outline"
                                    }
                                    size="sm"
                                    onClick={handleToggleMarkForReview}
                                    className="gap-2"
                                >
                                    <Flag
                                        className={
                                            currentQuestion?._markedForReview ? "fill-current" : ""
                                        }
                                        size={16}
                                    />
                                    {currentQuestion?._markedForReview
                                        ? "Marked"
                                        : "Mark for Review"}
                                </Button>
                            </div>
                            <div className="mt-4 prose prose-sm max-w-none dark:prose-invert">
                                <pre className="whitespace-pre-wrap warp-break-words bg-muted p-4 rounded-md overflow-auto">
                                    {JSON.stringify(activeQuestion, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </article>
                ) : (
                    <div className="p-6 border rounded-lg text-center text-muted-foreground">
                        No questions available
                    </div>
                )}
            </main>

            <aside>
                <QuestionSidenav />
            </aside>
        </div>
    );
}
