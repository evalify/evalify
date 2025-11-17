"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Section = {
    id: string;
    title: string;
};

type QuestionItem = {
    id: string;
    index: number; // 1-based
    answered?: boolean;
    flagged?: boolean;
};

type Props = {
    sections?: Section[];
    currentSectionId?: string | null;
    onSectionClick?: (id: string) => void;
    questions: QuestionItem[];
    onQuestionClick?: (id: string) => void;
    activeQuestionId?: string | null;
};

export default function QuestionNav({
    sections = [],
    currentSectionId,
    onSectionClick,
    questions,
    onQuestionClick,
    activeQuestionId = null,
}: Props) {
    return (
        <aside className="w-72">
            <div className="space-y-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Sections</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="max-h-24">
                            <div className="flex gap-2 px-1">
                                {sections.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">No sections</div>
                                ) : (
                                    sections.map((s) => (
                                        <Button
                                            key={s.id}
                                            variant={
                                                s.id === currentSectionId ? "default" : "ghost"
                                            }
                                            size="sm"
                                            onClick={() => onSectionClick?.(s.id)}
                                            className="whitespace-nowrap"
                                        >
                                            {s.title}
                                        </Button>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Questions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-4 gap-2">
                            {questions.map((q) => {
                                const isActive = q.id === activeQuestionId;
                                return (
                                    <Button
                                        key={q.id}
                                        size="sm"
                                        variant={q.answered ? "outline" : "ghost"}
                                        onClick={() => onQuestionClick?.(q.id)}
                                        className={`h-10 w-10 p-0 flex items-center justify-center ${q.flagged ? "ring-2 ring-amber-400" : ""} ${isActive ? "ring-2 ring-primary" : ""}`}
                                    >
                                        <span className="sr-only">Question {q.index}</span>
                                        <div className="text-sm font-medium">{q.index}</div>
                                        {q.answered ? <Badge className="ml-1">✓</Badge> : null}
                                    </Button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </aside>
    );
}
