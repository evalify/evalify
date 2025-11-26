"use client";

import { useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { useExamCollectionsContext } from "../providers/exam-query-provider";
import { useQuestionResponses, useQuestionState } from "../hooks/use-exam-collections";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, X, ChevronDown, ChevronRight } from "lucide-react";
import type { QuestionItem } from "../lib/types";

/**
 * TanStack DB Inspector Component
 *
 * A development-only debugging tool that displays the contents of TanStack DB collections.
 * Shows questions, responses, and state collections in an organized, readable format.
 */
export function DBInspector() {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

    // Only render in development mode
    if (process.env.NODE_ENV !== "development") {
        return null;
    }

    return (
        <DBInspectorContent
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            expandedItems={expandedItems}
            setExpandedItems={setExpandedItems}
        />
    );
}

interface DBInspectorContentProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    expandedItems: Set<string>;
    setExpandedItems: (items: Set<string>) => void;
}

function DBInspectorContent({
    isOpen,
    setIsOpen,
    expandedItems,
    setExpandedItems,
}: DBInspectorContentProps) {
    const { collections } = useExamCollectionsContext();

    // Call hooks unconditionally - use null-forgiving operator since we know collections exists in dev mode
    const responsesHook = useQuestionResponses(collections!.responses);
    const statesHook = useQuestionState(collections!.state);

    // For questions, use useLiveQuery unconditionally
    const questionsQuery = useLiveQuery((q) =>
        q.from({ question: collections!.questions }).select(({ question }) => ({
            id: question.id,
            type: question.type,
            marks: question.marks,
            sectionId: question.sectionId,
            orderIndex: question.orderIndex,
            question: question.question,
            questionData: question.questionData,
        }))
    );

    const questions = questionsQuery?.data || [];
    const responses = responsesHook?.responses || [];
    const states = statesHook?.states || [];

    // Debug logging
    if (process.env.NODE_ENV === "development") {
        console.log("DB Inspector Data:", {
            responsesCount: responses?.length || 0,
            statesCount: states?.length || 0,
            questionsCount: questions?.length || 0,
            responses: responses,
            states: states,
            questions: questions,
        });
    }

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedItems(newExpanded);
    };

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 right-4 z-50 shadow-lg"
                size="sm"
                variant="outline"
            >
                <Database className="mr-2 h-4 w-4" />
                DB Inspector
            </Button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 w-[600px] max-h-[80vh] overflow-hidden shadow-2xl rounded-lg border bg-background">
            <Card className="border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            TanStack DB Inspector
                        </CardTitle>
                        <CardDescription>Development-only collection viewer</CardDescription>
                    </div>
                    <Button onClick={() => setIsOpen(false)} variant="ghost" size="sm">
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="max-h-[60vh] overflow-y-auto">
                    {/* Debug Info */}
                    <div className="mb-4 p-2 bg-muted rounded text-xs space-y-1">
                        <div>Responses: {responses?.length || 0}</div>
                        <div>States: {states?.length || 0}</div>
                        <div>Questions: {questions?.length || 0}</div>
                        <div className="text-muted-foreground">Check console for detailed logs</div>
                    </div>

                    <Tabs defaultValue="responses" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="responses">
                                Responses
                                <Badge variant="secondary" className="ml-2">
                                    {responses?.length || 0}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="state">
                                State
                                <Badge variant="secondary" className="ml-2">
                                    {states?.length || 0}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="questions">
                                Questions
                                <Badge variant="secondary" className="ml-2">
                                    {questions?.length || 0}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="responses" className="space-y-2 mt-4 min-h-[200px]">
                            <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs mb-2">
                                Tab Content: Responses ({responses?.length || 0} items)
                            </div>
                            {!responses || responses.length === 0 ? (
                                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                    <p className="text-sm text-muted-foreground font-medium">
                                        No responses yet
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Answer a question to see responses here
                                    </p>
                                </div>
                            ) : (
                                responses
                                    .filter((r) => r?.questionId)
                                    .map((response) => (
                                        <div
                                            key={response.questionId}
                                            className="border rounded-lg p-3 space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <button
                                                    onClick={() =>
                                                        toggleExpand(response.questionId)
                                                    }
                                                    className="flex items-center gap-2 text-sm font-medium hover:text-primary"
                                                >
                                                    {expandedItems.has(response.questionId) ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                    Question:{" "}
                                                    {response.questionId?.slice(0, 8) || "Unknown"}
                                                    ...
                                                </button>
                                                <Badge variant="outline" className="text-xs">
                                                    {response.timestamp
                                                        ? new Date(
                                                              response.timestamp
                                                          ).toLocaleTimeString()
                                                        : "N/A"}
                                                </Badge>
                                            </div>
                                            {expandedItems.has(response.questionId) && (
                                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                                    {JSON.stringify(response.response, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    ))
                            )}
                        </TabsContent>

                        <TabsContent value="state" className="space-y-2 mt-4 min-h-[200px]">
                            <div className="p-2 bg-green-50 dark:bg-green-950 rounded text-xs mb-2">
                                Tab Content: State ({states?.length || 0} items)
                            </div>
                            {!states || states.length === 0 ? (
                                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                    <p className="text-sm text-muted-foreground font-medium">
                                        No state data yet
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Navigate questions to see state tracking
                                    </p>
                                </div>
                            ) : (
                                states
                                    .filter((s) => s?.questionId)
                                    .map((state) => (
                                        <div
                                            key={state.questionId}
                                            className="border rounded-lg p-3 flex items-center justify-between"
                                        >
                                            <span className="text-sm font-medium">
                                                {state.questionId?.slice(0, 8) || "Unknown"}...
                                            </span>
                                            <div className="flex gap-2">
                                                {state.visited && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Visited
                                                    </Badge>
                                                )}
                                                {state.markedForReview && (
                                                    <Badge variant="default" className="text-xs">
                                                        Marked
                                                    </Badge>
                                                )}
                                                {!state.visited && !state.markedForReview && (
                                                    <Badge variant="outline" className="text-xs">
                                                        Unvisited
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))
                            )}
                        </TabsContent>

                        <TabsContent value="questions" className="space-y-2 mt-4 min-h-[200px]">
                            <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded text-xs mb-2">
                                Tab Content: Questions ({questions?.length || 0} items)
                            </div>
                            {!questions || questions.length === 0 ? (
                                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                    <p className="text-sm text-muted-foreground font-medium">
                                        No questions loaded
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Questions will appear here when loaded
                                    </p>
                                </div>
                            ) : (
                                questions
                                    .filter((q) => q?.id)
                                    .map((question: QuestionItem) => (
                                        <div
                                            key={question.id}
                                            className="border rounded-lg p-3 space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <button
                                                    onClick={() => toggleExpand(question.id)}
                                                    className="flex items-center gap-2 text-sm font-medium hover:text-primary"
                                                >
                                                    {expandedItems.has(question.id) ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                    {question.id?.slice(0, 8) || "Unknown"}...
                                                </button>
                                                <div className="flex gap-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        {question.type || "N/A"}
                                                    </Badge>
                                                    {question.marks && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-xs"
                                                        >
                                                            {question.marks} marks
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            {expandedItems.has(question.id) && (
                                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                                                    {JSON.stringify(question, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    ))
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
