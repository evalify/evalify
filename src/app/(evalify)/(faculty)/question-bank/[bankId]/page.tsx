"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Trash2, ChevronRight, Edit2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import { cn } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/ui/custom-alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { QuestionRender } from "@/components/question/question-renderer";
import type { Question } from "@/types/questions";
import { useQuestionNavigation } from "@/contexts/question-navigation-context";
import { useSidebar } from "@/components/ui/sidebar";

export interface QuestionListRef {
    scrollToQuestion: (questionId: string) => void;
}

type TopicLink = {
    topicId: string;
    topicName: string;
};

// This matches the actual return type from the backend's TransformedQuestion
type QuestionWithTopics = {
    id: string;
    type: string;
    question: string;
    marks: number;
    negativeMarks: number;
    difficulty?: string;
    courseOutcome?: string;
    bloomTaxonomyLevel?: string;
    topics: TopicLink[];
    // Type-specific fields that may be present
    questionData?: {
        options?: Array<{
            id: string;
            optionText: string;
            orderIndex: number;
        }>;
    };
    solution?: {
        correctOptions?: Array<{
            id: string;
            isCorrect: boolean;
        }>;
    };
    trueFalseAnswer?: boolean;
    explanation?: string;
    blankConfig?: Record<string, unknown>;
    descriptiveConfig?: Record<string, unknown>;
    options?: Array<Record<string, unknown>>;
};

export default function QuestionBankPage() {
    const params = useParams<{ bankId: string }>();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { success, error } = useToast();
    const { track } = useAnalytics();
    const utils = trpc.useUtils();
    const { navigationState, clearNavigationTarget } = useQuestionNavigation();

    const bankId = Array.isArray(params.bankId) ? params.bankId[0] : params.bankId;

    const [newTopicInput, setNewTopicInput] = useState("");
    const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
    const [editingTopicName, setEditingTopicName] = useState("");
    const [topicToDelete, setTopicToDelete] = useState<{ id: string; name: string } | null>(null);
    const [questionToDelete, setQuestionToDelete] = useState<{ id: string } | null>(null);

    const questionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const questionListRef = useRef<QuestionListRef>(null);

    const NO_TOPIC_ID = "no-topic";

    // Derive selected topics from navigation state or URL params
    const selectedTopics = useMemo(() => {
        // Priority 1: Navigation state from question creation/edit
        if (navigationState.bankId === bankId && navigationState.topicIds) {
            return navigationState.topicIds.length > 0 ? navigationState.topicIds : [NO_TOPIC_ID];
        }

        // Priority 2: URL params for direct navigation
        const topicsParam = searchParams.get("topics");
        if (topicsParam) {
            return topicsParam.split(",");
        }

        // Default: empty array (will show all or need initialization)
        return [];
    }, [navigationState.bankId, navigationState.topicIds, bankId, searchParams]);

    const { open, toggleSidebar } = useSidebar();

    useEffect(() => {
        if (open) {
            toggleSidebar();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch bank details
    const { data: bank, isLoading: isBankLoading } = trpc.bank.get.useQuery({ id: bankId });

    // Determine if user has edit access (OWNER or EDIT, not READ)
    const hasEditAccess = bank?.accessLevel !== "READ";

    // Fetch topics
    const { data: topics, isLoading: isTopicsLoading } = trpc.topic.listByBank.useQuery({
        bankId,
    });

    // Fetch questions by selected topics
    const { data: questionsData, isLoading: isQuestionsLoading } =
        trpc.question.listByTopics.useQuery(
            {
                bankId,
                topicIds: selectedTopics.filter((id) => id !== NO_TOPIC_ID),
            },
            {
                enabled: selectedTopics.length > 0 && !selectedTopics.includes(NO_TOPIC_ID),
            }
        );
    const questions = questionsData as QuestionWithTopics[] | undefined;

    // Fetch questions without topics (when "No Topic" is selected)
    const { data: questionsWithoutTopicsData, isLoading: isQuestionsWithoutTopicsLoading } =
        trpc.question.listByBank.useQuery(
            {
                bankId,
            },
            {
                enabled: selectedTopics.includes(NO_TOPIC_ID),
            }
        );
    const questionsWithoutTopics = questionsWithoutTopicsData as QuestionWithTopics[] | undefined;

    // Combine and filter questions based on selection
    const displayQuestions = selectedTopics.includes(NO_TOPIC_ID)
        ? (questionsWithoutTopics || []).filter((q) => !q.topics || q.topics.length === 0)
        : questions;

    const isLoadingQuestions = selectedTopics.includes(NO_TOPIC_ID)
        ? isQuestionsWithoutTopicsLoading
        : isQuestionsLoading;

    // Auto-scroll to new question from context
    useEffect(() => {
        if (
            navigationState.bankId === bankId &&
            navigationState.questionId &&
            displayQuestions &&
            !isLoadingQuestions
        ) {
            // Check if the question exists in the current display
            const questionExists = displayQuestions.some(
                (q) => q.id === navigationState.questionId
            );

            if (questionExists && questionListRef.current) {
                // Use the QuestionList's scroll method
                const timer = setTimeout(() => {
                    questionListRef.current?.scrollToQuestion(navigationState.questionId!);
                    clearNavigationTarget();
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [navigationState, bankId, displayQuestions, isLoadingQuestions, clearNavigationTarget]);

    // Create topic mutation
    const createTopicMutation = trpc.topic.create.useMutation({
        onSuccess: (newTopic) => {
            success("Topic created successfully!");
            utils.topic.listByBank.invalidate({ bankId });
            setNewTopicInput("");
            track("topic_created", { bankId, topicId: newTopic.id });
        },
        onError: (err) => {
            error(err.message || "Failed to create topic");
        },
    });

    // Delete topic mutation
    const deleteTopicMutation = trpc.topic.delete.useMutation({
        onSuccess: (data) => {
            success("Topic deleted successfully!");
            utils.topic.listByBank.invalidate({ bankId });

            // Remove deleted topic from selected topics in URL params
            const updatedTopics = selectedTopics.filter((id) => id !== data.id);
            if (updatedTopics.length > 0) {
                router.push(`/question-bank/${bankId}?topics=${updatedTopics.join(",")}`);
            } else {
                router.push(`/question-bank/${bankId}`);
            }

            setTopicToDelete(null);
            track("topic_deleted", { bankId, topicId: data.id });
        },
        onError: (err) => {
            error(err.message || "Failed to delete topic");
        },
    });

    // Update topic mutation
    const updateTopicMutation = trpc.topic.update.useMutation({
        onSuccess: (updatedTopic) => {
            success("Topic updated successfully!");
            utils.topic.listByBank.invalidate({ bankId });
            setEditingTopicId(null);
            setEditingTopicName("");
            track("topic_updated", { bankId, topicId: updatedTopic.id });
        },
        onError: (err) => {
            error(err.message || "Failed to update topic");
        },
    });

    // Delete question mutation
    const deleteQuestionMutation = trpc.question.delete.useMutation({
        onSuccess: (data) => {
            success("Question deleted successfully!");
            utils.question.listByTopics.invalidate({
                bankId,
                topicIds: selectedTopics.filter((id) => id !== NO_TOPIC_ID),
            });
            utils.question.listByBank.invalidate({ bankId });
            setQuestionToDelete(null);
            track("question_deleted", { bankId, questionId: data.id });
        },
        onError: (err) => {
            error(err.message || "Failed to delete question");
        },
    });

    const handleCreateTopic = () => {
        if (!newTopicInput.trim()) {
            error("Topic name cannot be empty");
            return;
        }

        createTopicMutation.mutate({
            bankId,
            name: newTopicInput.trim(),
        });
    };

    const handleDeleteTopic = (topicId: string, topicName: string) => {
        setTopicToDelete({ id: topicId, name: topicName });
    };

    const confirmDeleteTopic = () => {
        if (topicToDelete) {
            deleteTopicMutation.mutate({ topicId: topicToDelete.id });
        }
    };

    const handleEditTopic = (topicId: string, currentName: string) => {
        setEditingTopicId(topicId);
        setEditingTopicName(currentName);
    };

    const handleSaveEdit = (topicId: string) => {
        if (!editingTopicName.trim()) {
            error("Topic name cannot be empty");
            return;
        }

        updateTopicMutation.mutate({
            topicId,
            name: editingTopicName.trim(),
        });
    };

    const handleCancelEdit = () => {
        setEditingTopicId(null);
        setEditingTopicName("");
    };

    const toggleTopicSelection = (topicId: string) => {
        const updatedTopics = selectedTopics.includes(topicId)
            ? selectedTopics.filter((id) => id !== topicId)
            : [...selectedTopics, topicId];

        if (updatedTopics.length > 0) {
            router.push(`/question-bank/${bankId}?topics=${updatedTopics.join(",")}`);
        } else {
            router.push(`/question-bank/${bankId}`);
        }
    };

    const handleSelectAllTopics = () => {
        const allTopicIds = topics ? topics.map((t) => t.id) : [];
        // Include NO_TOPIC_ID as well
        const allIds = [...allTopicIds];
        router.push(`/question-bank/${bankId}?topics=${allIds.join(",")}`);
        track("topics_select_all", { bankId, count: allIds.length });
    };

    const handleDeselectAllTopics = () => {
        router.push(`/question-bank/${bankId}`);
        track("topics_deselect_all", { bankId });
    };

    const handleCreateQuestion = () => {
        // Pass selected topics as URL params (excluding NO_TOPIC_ID)
        const validTopics = selectedTopics.filter((id) => id !== NO_TOPIC_ID);
        if (validTopics.length > 0) {
            router.push(`/question-bank/${bankId}/question/create?topics=${validTopics.join(",")}`);
        } else {
            router.push(`/question-bank/${bankId}/question/create`);
        }
    };

    const handleEditQuestion = (questionId: string) => {
        router.push(`/question-bank/${bankId}/question/${questionId}`);
    };

    const handleDeleteQuestion = (questionId: string) => {
        setQuestionToDelete({ id: questionId });
    };

    const confirmDeleteQuestion = () => {
        if (questionToDelete) {
            deleteQuestionMutation.mutate({
                questionId: questionToDelete.id,
                bankId,
            });
        }
    };

    if (isBankLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!bank) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-muted-foreground">Bank not found</p>
            </div>
        );
    }

    return (
        <div className="flex h-[90vh] overflow-hidden">
            {/* Left Sidebar - Topics */}
            <div className="w-80 border-r bg-background flex flex-col">
                <div className="p-4 border-b">
                    <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold mb-1">Topics</h2>
                            <p className="text-xs text-muted-foreground">
                                Select topics to filter questions
                            </p>
                        </div>

                        {/* Select All / Deselect All toggle button */}
                        {topics && topics.length > 0 && hasEditAccess && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={
                                    selectedTopics.length > 0
                                        ? handleDeselectAllTopics
                                        : handleSelectAllTopics
                                }
                                className="h-7 text-xs px-2 shrink-0 border border-border/80"
                                disabled={isTopicsLoading}
                            >
                                {selectedTopics.length > 0 ? (
                                    <>
                                        <X className="h-3 w-3 mr-1" />
                                        Clear
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-3 w-3 mr-1" />
                                        All
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {isTopicsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            {topics && topics.length > 0 ? (
                                topics.map((topic) => (
                                    <div
                                        key={topic.id}
                                        className={cn(
                                            "group flex items-center justify-between gap-2 p-3 rounded-lg border transition-all",
                                            editingTopicId === topic.id
                                                ? "bg-accent border-primary"
                                                : selectedTopics.includes(topic.id)
                                                  ? "bg-accent border-primary cursor-pointer hover:border-primary/50 hover:bg-accent"
                                                  : "bg-background cursor-pointer hover:border-primary/50 hover:bg-accent"
                                        )}
                                        onClick={() => {
                                            if (editingTopicId !== topic.id) {
                                                toggleTopicSelection(topic.id);
                                            }
                                        }}
                                    >
                                        {editingTopicId === topic.id ? (
                                            <>
                                                <Input
                                                    value={editingTopicName}
                                                    onChange={(e) =>
                                                        setEditingTopicName(e.target.value)
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            handleSaveEdit(topic.id);
                                                        } else if (e.key === "Escape") {
                                                            handleCancelEdit();
                                                        }
                                                    }}
                                                    className="flex-1 h-7"
                                                    autoFocus
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <div className="flex gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSaveEdit(topic.id);
                                                        }}
                                                        disabled={updateTopicMutation.isPending}
                                                    >
                                                        {updateTopicMutation.isPending ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Check className="h-3.5 w-3.5 text-green-600" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCancelEdit();
                                                        }}
                                                        disabled={updateTopicMutation.isPending}
                                                    >
                                                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-sm font-medium truncate flex-1">
                                                            {topic.name}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{topic.name}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                {hasEditAccess && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleEditTopic(
                                                                            topic.id,
                                                                            topic.name
                                                                        );
                                                                    }}
                                                                >
                                                                    <Edit2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Edit topic</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteTopic(
                                                                            topic.id,
                                                                            topic.name
                                                                        );
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Delete topic</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-sm text-muted-foreground">No topics yet</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Add your first topic above
                                    </p>
                                </div>
                            )}

                            {/* No Topic pseudo-topic */}
                            <div
                                className={cn(
                                    "flex items-center gap-2 p-3 rounded-lg border transition-all cursor-pointer",
                                    selectedTopics.includes(NO_TOPIC_ID)
                                        ? "bg-accent border-primary"
                                        : "bg-muted/50 hover:border-primary/50 hover:bg-accent"
                                )}
                                onClick={() => toggleTopicSelection(NO_TOPIC_ID)}
                            >
                                <span className="text-sm font-medium italic text-muted-foreground">
                                    No Topic
                                </span>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex gap-2 m-4 border-t pt-4">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex gap-2 w-full">
                                <Input
                                    placeholder="Add new topic"
                                    value={newTopicInput}
                                    onChange={(e) => {
                                        if (hasEditAccess) {
                                            setNewTopicInput(e.target.value);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (hasEditAccess && e.key === "Enter") {
                                            handleCreateTopic();
                                        }
                                    }}
                                    disabled={!hasEditAccess || createTopicMutation.isPending}
                                    className="flex-1"
                                />
                                <Button
                                    size="icon"
                                    onClick={hasEditAccess ? handleCreateTopic : undefined}
                                    disabled={
                                        !hasEditAccess ||
                                        createTopicMutation.isPending ||
                                        !newTopicInput.trim()
                                    }
                                >
                                    {createTopicMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </TooltipTrigger>
                        {!hasEditAccess && (
                            <TooltipContent>
                                <p>You have read-only access for this bank</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                <div className="p-6 border-b bg-background/95 backdrop-blur">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">{bank.name}</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                {bank.courseCode && `${bank.courseCode} • `}
                                Semester {bank.semester}
                            </p>
                        </div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button
                                        onClick={hasEditAccess ? handleCreateQuestion : undefined}
                                        disabled={!hasEditAccess}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create Question
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            {!hasEditAccess && (
                                <TooltipContent>
                                    <p>You have read-only access for this bank</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </div>
                </div>

                <div className="flex-1  p-6">
                    {selectedTopics.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <ChevronRight className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-sm text-muted-foreground">
                                    Select a topic from the sidebar to view questions
                                </p>
                            </CardContent>
                        </Card>
                    ) : isLoadingQuestions ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : displayQuestions && displayQuestions.length > 0 ? (
                        <QuestionList
                            ref={questionListRef}
                            questions={displayQuestions}
                            selectedTopics={selectedTopics}
                            NO_TOPIC_ID={NO_TOPIC_ID}
                            questionRefs={questionRefs}
                            onEdit={handleEditQuestion}
                            onDelete={handleDeleteQuestion}
                            hasEditAccess={hasEditAccess}
                        />
                    ) : (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <p className="text-sm text-muted-foreground">
                                    No questions found for the selected topic
                                    {selectedTopics.length !== 1 ? "s" : ""}
                                </p>
                                {hasEditAccess && (
                                    <Button
                                        variant="outline"
                                        className="mt-4"
                                        onClick={handleCreateQuestion}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create First Question
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                title="Delete Topic"
                message={`Are you sure you want to delete "${topicToDelete?.name}"? This action cannot be undone.`}
                onAccept={confirmDeleteTopic}
                confirmButtonText="Delete"
                cancelButtonText="Cancel"
                isOpen={!!topicToDelete}
                onOpenChange={(open) => {
                    if (!open) setTopicToDelete(null);
                }}
            />

            {/* Delete Question Confirmation Dialog */}
            <ConfirmationDialog
                title="Delete Question"
                message="Are you sure you want to delete this question? This action cannot be undone."
                onAccept={confirmDeleteQuestion}
                confirmButtonText="Delete"
                cancelButtonText="Cancel"
                isOpen={!!questionToDelete}
                onOpenChange={(open) => {
                    if (!open) setQuestionToDelete(null);
                }}
            />
        </div>
    );
}

type QuestionListProps = {
    questions: QuestionWithTopics[];
    selectedTopics: string[];
    NO_TOPIC_ID: string;
    questionRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    hasEditAccess: boolean;
};

const QuestionList = forwardRef<QuestionListRef, QuestionListProps>(
    (
        { questions, selectedTopics, NO_TOPIC_ID, questionRefs, onEdit, onDelete, hasEditAccess },
        ref
    ) => {
        const parentRef = useRef<HTMLDivElement>(null);

        // eslint-disable-next-line react-hooks/incompatible-library
        const virtualizer = useVirtualizer({
            count: questions.length,
            getScrollElement: () => parentRef.current,
            estimateSize: () => 400, // Estimated height of each question card
            overscan: 2, // Render 2 extra items above and below viewport
        });

        // Expose scroll method to parent
        useImperativeHandle(ref, () => ({
            scrollToQuestion: (questionId: string) => {
                const index = questions.findIndex((q) => q.id === questionId);
                if (index !== -1) {
                    // Scroll virtualizer to the index
                    virtualizer.scrollToIndex(index, {
                        align: "center",
                        behavior: "smooth",
                    });
                }
            },
        }));

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                        Showing {questions.length} question
                        {questions.length !== 1 ? "s" : ""} for{" "}
                        {selectedTopics.includes(NO_TOPIC_ID)
                            ? "No Topic"
                            : selectedTopics.length === 1
                              ? "1 topic"
                              : `${selectedTopics.length} topics`}
                    </p>
                </div>
                <div
                    ref={parentRef}
                    className="h-[calc(100vh-240px)] overflow-auto"
                    style={{
                        contain: "strict",
                    }}
                >
                    <div
                        style={{
                            height: `${virtualizer.getTotalSize()}px`,
                            width: "100%",
                            position: "relative",
                        }}
                    >
                        {virtualizer.getVirtualItems().map((virtualItem) => {
                            const question = questions[virtualItem.index];
                            return (
                                <div
                                    key={question.id}
                                    data-index={virtualItem.index}
                                    ref={(el) => {
                                        virtualizer.measureElement(el);
                                        if (el && question.id) {
                                            questionRefs.current.set(question.id, el);
                                        }
                                    }}
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        width: "100%",
                                        transform: `translateY(${virtualItem.start}px)`,
                                    }}
                                    className="pb-6"
                                >
                                    <QuestionRender
                                        question={question as Question}
                                        questionNumber={virtualItem.index + 1}
                                        showMetadata={true}
                                        showSolution={true}
                                        showExplanation={true}
                                        isReadOnly={true}
                                        compareWithStudentAnswer={false}
                                        onEdit={hasEditAccess ? onEdit : undefined}
                                        onDelete={hasEditAccess ? onDelete : undefined}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }
);

QuestionList.displayName = "QuestionList";
