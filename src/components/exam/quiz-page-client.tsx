"use client";

import React from "react";
import { useQuizContext } from "./context/quiz-context";
import QuestionSidenav from "./question-sidenav";
import { QuestionFactory } from "./question-types/question-factory";
import { Button } from "@/components/ui/button";
import { Flag, CheckCircle } from "lucide-react";
import type { StudentAnswer } from "./lib/types";
import { DBInspector } from "./debug/db-inspector";

export default function QuizPageClient() {
    const {
        sanitizedQuestions,
        currentQuestion,
        toggleMarkForReview,
        setSelectedQuestion,
        saveAnswer,
        isAutoSubmitting,
        isSubmitted,
    } = useQuizContext();

    // Use currentQuestion directly - it has the response merged in from the context
    const activeQuestion = currentQuestion;
    const activeIndex = activeQuestion
        ? sanitizedQuestions.findIndex((q) => q.id === activeQuestion.id)
        : -1;

    const handleToggleMarkForReview = () => {
        if (currentQuestion?.id) {
            toggleMarkForReview(currentQuestion.id);
        }
    };

    const handleNextQuestion = () => {
        if (activeIndex < sanitizedQuestions.length - 1) {
            const nextQuestion = sanitizedQuestions[activeIndex + 1];
            setSelectedQuestion(nextQuestion.id);
        }
    };

    const handlePreviousQuestion = () => {
        if (activeIndex > 0) {
            const prevQuestion = sanitizedQuestions[activeIndex - 1];
            setSelectedQuestion(prevQuestion.id);
        }
    };

    const handleClearQuestion = () => {
        if (activeQuestion?.id && currentQuestion?.response) {
            // Create an empty answer based on the question type
            const emptyAnswer: StudentAnswer = { studentAnswer: "" } as StudentAnswer;
            saveAnswer({ [activeQuestion.id]: emptyAnswer });
        }
    };

    if (isAutoSubmitting) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-lg font-medium text-muted-foreground">
                        Time expired! Submitting your quiz...
                    </p>
                </div>
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-6 max-w-md p-6 text-center">
                    <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
                        <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-500" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">
                            Quiz Submitted Successfully!
                        </h2>
                        <p className="text-muted-foreground">
                            Your answers have been recorded. You can now return to your dashboard.
                        </p>
                    </div>
                    <Button onClick={() => (window.location.href = "/student/quiz")}>
                        Go to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
            <main className="space-y-4">
                <h2 className="sr-only">Quiz Questions</h2>
                {activeQuestion ? (
                    <article className="space-y-4">
                        <div className="p-6 border rounded-lg shadow-sm flex flex-col h-[850px]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">
                                    Question {activeIndex + 1}
                                </h3>
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
                            <div className="mt-4 flex-1">
                                <QuestionFactory
                                    question={activeQuestion}
                                    onAnswerChange={(answer) => {
                                        if (activeQuestion.id) {
                                            saveAnswer({ [activeQuestion.id]: answer });
                                        }
                                    }}
                                />
                            </div>

                            <div className="mt-8 flex justify-between items-center pt-4 border-t">
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handlePreviousQuestion}
                                        disabled={activeIndex <= 0}
                                        variant="outline"
                                    >
                                        Previous
                                    </Button>

                                    <Button
                                        onClick={handleClearQuestion}
                                        disabled={!currentQuestion?.response}
                                        variant="outline"
                                    >
                                        Clear
                                    </Button>
                                </div>
                                <Button
                                    onClick={handleNextQuestion}
                                    disabled={activeIndex === sanitizedQuestions.length - 1}
                                >
                                    Next
                                </Button>
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

            {/* Development-only DB Inspector */}
            <DBInspector />
        </div>
    );
}
