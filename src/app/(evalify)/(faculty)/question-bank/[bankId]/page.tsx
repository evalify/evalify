"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Loader2,
    Plus,
    Trash2,
    ChevronRight,
    Edit2,
    Check,
    X,
    Filter,
    FileQuestion,
    ArrowUpDown,
    Search,
    Upload,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import { cn } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/ui/custom-alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { QuestionRender } from "@/components/question/question-renderer";
import type { Question } from "@/types/questions";
import { useQuestionNavigation } from "@/contexts/question-navigation-context";
import { useSidebar } from "@/components/ui/sidebar";
import { UploadQuestionsDialog } from "@/components/question-bank/upload-questions-dialog";

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
    const [topicErrorDialogOpen, setTopicErrorDialogOpen] = useState(false);
    const [topicErrorMessage, setTopicErrorMessage] = useState("");
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

    // Question type filter state
    const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>([]);

    // Sort state
    const [sortBy, setSortBy] = useState<"difficulty" | "marks" | "courseOutcome" | null>(null);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    // Search state
    const [searchInput, setSearchInput] = useState(""); // For the input field
    const [searchQuery, setSearchQuery] = useState(""); // For the actual filtering (debounced)
    const [isSearching, setIsSearching] = useState(false); // For showing loading indicator

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

    // Debounce search input
    useEffect(() => {
        if (searchInput.trim() !== searchQuery.trim()) {
            setIsSearching(true);
        }

        const timer = setTimeout(() => {
            setSearchQuery(searchInput);
            setIsSearching(false);
        }, 300); // 300ms debounce

        return () => {
            clearTimeout(timer);
            setIsSearching(false);
        };
    }, [searchInput, searchQuery]);

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
    const _questions = questionsData as QuestionWithTopics[] | undefined;

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

    // Combine and filter questions based on selection and filters
    const displayQuestions = useMemo(() => {
        let questions: QuestionWithTopics[] | undefined = selectedTopics.includes(NO_TOPIC_ID)
            ? (questionsWithoutTopics || []).filter((q) => !q.topics || q.topics.length === 0)
            : (questionsData as QuestionWithTopics[] | undefined);

        // Apply question type filter if any types are selected
        if (selectedQuestionTypes.length > 0 && questions) {
            questions = questions.filter((question) =>
                selectedQuestionTypes.includes(question.type)
            );
        }

        // Apply search filter if search query exists
        if (searchQuery.trim() && questions) {
            const query = searchQuery.toLowerCase().trim();
            questions = questions.filter((question) => {
                // Search in question text
                const questionText = question.question?.toLowerCase() || "";
                // Search in explanation
                const explanationText = question.explanation?.toLowerCase() || "";
                // Search in course outcome
                const courseOutcome = question.courseOutcome?.toLowerCase() || "";
                // Search in difficulty
                const difficulty = question.difficulty?.toLowerCase() || "";
                // Search in question type
                const questionType = question.type?.toLowerCase().replace(/_/g, " ") || "";

                return (
                    questionText.includes(query) ||
                    explanationText.includes(query) ||
                    courseOutcome.includes(query) ||
                    difficulty.includes(query) ||
                    questionType.includes(query)
                );
            });
        }

        // Apply sorting if selected
        if (sortBy && questions) {
            questions = [...questions].sort((a, b) => {
                let aValue: string | number;
                let bValue: string | number;

                switch (sortBy) {
                    case "difficulty":
                        // Define difficulty order: EASY < MEDIUM < HARD
                        const difficultyOrder = { EASY: 1, MEDIUM: 2, HARD: 3 };
                        aValue = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 0;
                        bValue = difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 0;
                        break;
                    case "marks":
                        aValue = a.marks || 0;
                        bValue = b.marks || 0;
                        break;
                    case "courseOutcome":
                        aValue = a.courseOutcome || "";
                        bValue = b.courseOutcome || "";
                        break;
                    default:
                        return 0;
                }

                if (typeof aValue === "string" && typeof bValue === "string") {
                    return sortOrder === "asc"
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                } else {
                    return sortOrder === "asc"
                        ? (aValue as number) - (bValue as number)
                        : (bValue as number) - (aValue as number);
                }
            });
        }

        return questions;
    }, [
        selectedTopics,
        questionsWithoutTopics,
        questionsData,
        selectedQuestionTypes,
        sortBy,
        sortOrder,
        searchQuery,
        NO_TOPIC_ID,
    ]);

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
            const message = err.message || "Failed to create topic";
            // Always show error in alert dialog for better user visibility
            setTopicErrorMessage(message);
            setTopicErrorDialogOpen(true);
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
            const message = err.message || "Failed to update topic";
            // Always show error in alert dialog for better user visibility
            setTopicErrorMessage(message);
            setTopicErrorDialogOpen(true);
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

    // Available question types (based on the schema)
    const availableQuestionTypes = [
        "MCQ",
        "MMCQ",
        "TRUE_FALSE",
        "DESCRIPTIVE",
        "FILL_THE_BLANK",
        "MATCHING",
        "FILE_UPLOAD",
        "CODING",
    ];

    // Helper functions for question type filtering
    const handleQuestionTypeToggle = (type: string) => {
        setSelectedQuestionTypes((prev) =>
            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
        );

        track("question_filter_applied", {
            bankId,
            filterType: "question_type",
            value: type,
        });
    };

    const handleClearQuestionTypeFilters = () => {
        setSelectedQuestionTypes([]);
        track("question_filter_cleared", { bankId, filterType: "question_type" });
    };

    // Helper functions for sorting
    const handleSort = (field: "difficulty" | "marks" | "courseOutcome") => {
        if (sortBy === field) {
            // Toggle sort order if same field
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            // Set new field and default to ascending
            setSortBy(field);
            setSortOrder("asc");
        }

        track("question_sort_applied", {
            bankId,
            sortBy: field,
            sortOrder: sortBy === field ? (sortOrder === "asc" ? "desc" : "asc") : "asc",
        });
    };

    const handleClearSort = () => {
        setSortBy(null);
        setSortOrder("asc");
        track("question_sort_cleared", { bankId });
    };

    // Helper functions for search
    const handleSearchChange = (value: string) => {
        setSearchInput(value);
        track("question_search_used", {
            bankId,
            searchLength: value.length,
        });
    };

    const handleClearSearch = () => {
        setSearchInput("");
        setSearchQuery("");
        track("question_search_cleared", { bankId });
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
                        <div className="flex gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span>
                                        <Button
                                            variant="outline"
                                            onClick={
                                                hasEditAccess
                                                    ? () => setIsUploadDialogOpen(true)
                                                    : undefined
                                            }
                                            disabled={!hasEditAccess || selectedTopics.length === 0}
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload Questions
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                {!hasEditAccess ? (
                                    <TooltipContent>
                                        <p>You have read-only access for this bank</p>
                                    </TooltipContent>
                                ) : selectedTopics.length === 0 ? (
                                    <TooltipContent>
                                        <p>Select at least one topic to upload questions</p>
                                    </TooltipContent>
                                ) : null}
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span>
                                        <Button
                                            onClick={
                                                hasEditAccess ? handleCreateQuestion : undefined
                                            }
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
                </div>

                <div className="flex-1 p-6">
                    {selectedTopics.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <ChevronRight className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-sm text-muted-foreground">
                                    Select a topic from the sidebar to view questions
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {/* Filter and Sort Controls - Always Visible */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <p className="text-sm text-muted-foreground">
                                        {isLoadingQuestions ? (
                                            "Loading questions..."
                                        ) : (
                                            <>
                                                Showing {displayQuestions?.length || 0} question
                                                {(displayQuestions?.length || 0) !== 1
                                                    ? "s"
                                                    : ""}{" "}
                                                for{" "}
                                                {selectedTopics.includes(NO_TOPIC_ID)
                                                    ? "No Topic"
                                                    : selectedTopics.length === 1
                                                      ? "1 topic"
                                                      : `${selectedTopics.length} topics`}
                                            </>
                                        )}
                                    </p>
                                    {/* Show active filters */}
                                    {(selectedQuestionTypes && selectedQuestionTypes.length > 0) ||
                                        (searchQuery.trim() && (
                                            <div className="flex items-center gap-4">
                                                {/* Show search query */}
                                                {searchQuery.trim() && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">
                                                            Searching for:
                                                        </span>
                                                        <Badge
                                                            variant="outline"
                                                            className="h-5 px-2 text-xs bg-blue-50 border-blue-200 text-blue-700"
                                                        >
                                                            &quot;{searchQuery.trim()}&quot;
                                                        </Badge>
                                                    </div>
                                                )}
                                                {/* Show question type filters */}
                                                {selectedQuestionTypes &&
                                                    selectedQuestionTypes.length > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground">
                                                                Filtered by:
                                                            </span>
                                                            <div className="flex gap-1">
                                                                {selectedQuestionTypes.map(
                                                                    (type) => (
                                                                        <Badge
                                                                            key={type}
                                                                            variant="outline"
                                                                            className="h-5 px-2 text-xs"
                                                                        >
                                                                            {type.replace(
                                                                                /_/g,
                                                                                " "
                                                                            )}
                                                                        </Badge>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>
                                        ))}
                                </div>

                                {/* Sort and Filter Buttons */}
                                <div className="flex items-center gap-2">
                                    {/* Search Input */}
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder="Search questions..."
                                            value={searchInput}
                                            onChange={(e) => handleSearchChange(e.target.value)}
                                            className="w-64 pl-9 pr-9 h-8"
                                        />
                                        {isSearching ? (
                                            <div className="absolute right-1 top-1/2 h-6 w-6 p-0 -translate-y-1/2 flex items-center justify-center">
                                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : searchInput ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleClearSearch}
                                                className="absolute right-1 top-1/2 h-6 w-6 p-0 -translate-y-1/2 hover:bg-muted"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        ) : null}
                                    </div>

                                    {/* Sort Button */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="gap-2">
                                                <ArrowUpDown className="h-4 w-4" />
                                                Sort
                                                {sortBy && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="ml-1 h-4 px-1.5 text-xs"
                                                    >
                                                        {sortBy === "courseOutcome" ? "CO" : sortBy}
                                                    </Badge>
                                                )}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-64 p-0" align="end">
                                            <div className="p-4 border-b">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <ArrowUpDown className="h-4 w-4 text-primary" />
                                                        <h3 className="font-medium">
                                                            Sort Questions
                                                        </h3>
                                                    </div>
                                                    {sortBy && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={handleClearSort}
                                                            className="h-7 px-2 text-xs"
                                                        >
                                                            Clear
                                                        </Button>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Sort questions by different criteria
                                                </p>
                                            </div>
                                            <div className="p-2 space-y-1">
                                                {[
                                                    {
                                                        key: "difficulty",
                                                        label: "Difficulty",
                                                        desc: "Easy → Medium → Hard",
                                                    },
                                                    {
                                                        key: "marks",
                                                        label: "Marks",
                                                        desc: "Lowest → Highest",
                                                    },
                                                    {
                                                        key: "courseOutcome",
                                                        label: "Course Outcome",
                                                        desc: "CO1 → CO8",
                                                    },
                                                ].map(({ key, label, desc }) => (
                                                    <div
                                                        key={key}
                                                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                                                        onClick={() =>
                                                            handleSort(
                                                                key as
                                                                    | "difficulty"
                                                                    | "marks"
                                                                    | "courseOutcome"
                                                            )
                                                        }
                                                    >
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium">
                                                                    {label}
                                                                </span>
                                                                {sortBy === key && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="h-5 px-2 text-xs"
                                                                    >
                                                                        {sortOrder === "asc"
                                                                            ? "↑"
                                                                            : "↓"}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">
                                                                {desc}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {sortBy && (
                                                <div className="p-3 border-t">
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>Active sort:</span>
                                                        <Badge
                                                            variant="outline"
                                                            className="h-5 px-2 text-xs"
                                                        >
                                                            {sortBy === "courseOutcome"
                                                                ? "Course Outcome"
                                                                : sortBy.charAt(0).toUpperCase() +
                                                                  sortBy.slice(1)}
                                                            {sortOrder === "asc" ? " ↑" : " ↓"}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Question Type Filter Button */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="gap-2">
                                                <Filter className="h-4 w-4" />
                                                Filter
                                                {selectedQuestionTypes.length > 0 && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="ml-1 h-4 px-1.5 text-xs"
                                                    >
                                                        {selectedQuestionTypes.length}
                                                    </Badge>
                                                )}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-80 p-0" align="end">
                                            <div className="p-4 border-b">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <FileQuestion className="h-4 w-4 text-primary" />
                                                        <h3 className="font-medium">
                                                            Filter by Question Type
                                                        </h3>
                                                    </div>
                                                    {selectedQuestionTypes.length > 0 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={handleClearQuestionTypeFilters}
                                                            className="h-7 px-2 text-xs"
                                                        >
                                                            Clear All
                                                        </Button>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Select question types to filter the list
                                                </p>
                                            </div>
                                            <ScrollArea className="h-64 p-2">
                                                <div className="space-y-2">
                                                    {availableQuestionTypes.map((type) => (
                                                        <div
                                                            key={type}
                                                            className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                                                        >
                                                            <Checkbox
                                                                id={`filter-${type}`}
                                                                checked={selectedQuestionTypes.includes(
                                                                    type
                                                                )}
                                                                onCheckedChange={() =>
                                                                    handleQuestionTypeToggle(type)
                                                                }
                                                                className="h-4 w-4"
                                                            />
                                                            <Label
                                                                htmlFor={`filter-${type}`}
                                                                className="cursor-pointer flex-1 text-sm"
                                                            >
                                                                {type.replace(/_/g, " ")}
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                            {selectedQuestionTypes.length > 0 && (
                                                <div className="p-3 border-t">
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>Active filters:</span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {selectedQuestionTypes.map((type) => (
                                                                <Badge
                                                                    key={type}
                                                                    variant="outline"
                                                                    className="h-5 px-2 text-xs"
                                                                >
                                                                    {type.replace(/_/g, " ")}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            {/* Content Area */}
                            {isLoadingQuestions ? (
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
                                        <div className="p-6 bg-muted/50 rounded-full mb-6">
                                            <Filter className="h-16 w-16 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-xl font-semibold mb-2">
                                            No questions found
                                        </h3>
                                        <p className="text-muted-foreground text-center max-w-md mb-4">
                                            {searchQuery.trim()
                                                ? `No questions found matching "${searchQuery.trim()}". Try different keywords or clear your search.`
                                                : selectedQuestionTypes.length > 0
                                                  ? "No questions match your current filters. Try adjusting or clearing the filters above."
                                                  : `No questions found for the selected topic${selectedTopics.length !== 1 ? "s" : ""}.`}
                                        </p>
                                        {(selectedQuestionTypes.length > 0 ||
                                            sortBy ||
                                            searchQuery.trim()) && (
                                            <>
                                                <div className="flex gap-2">
                                                    {searchQuery.trim() && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={handleClearSearch}
                                                        >
                                                            <X className="h-4 w-4 mr-2" />
                                                            Clear Search
                                                        </Button>
                                                    )}
                                                    {selectedQuestionTypes.length > 0 && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={handleClearQuestionTypeFilters}
                                                        >
                                                            <X className="h-4 w-4 mr-2" />
                                                            Clear Filters
                                                        </Button>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                        {hasEditAccess &&
                                            selectedQuestionTypes.length === 0 &&
                                            !sortBy &&
                                            !searchQuery.trim() && (
                                                <Button
                                                    variant="outline"
                                                    className="mt-2"
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

            {/* Topic Error Alert Dialog */}
            <ConfirmationDialog
                title="Unable to Save Topic"
                message={topicErrorMessage}
                onAccept={() => setTopicErrorDialogOpen(false)}
                confirmButtonText="OK"
                isOpen={topicErrorDialogOpen}
                onOpenChange={setTopicErrorDialogOpen}
            />

            {/* Upload Questions Dialog */}
            <UploadQuestionsDialog
                isOpen={isUploadDialogOpen}
                onClose={() => setIsUploadDialogOpen(false)}
                selectedTopics={topics ? topics.filter((t) => selectedTopics.includes(t.id)) : []}
                bankId={bankId}
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
        {
            questions,
            selectedTopics: _selectedTopics,
            NO_TOPIC_ID: _NO_TOPIC_ID,
            questionRefs,
            onEdit,
            onDelete,
            hasEditAccess,
        },
        ref
    ) => {
        const parentRef = useRef<HTMLDivElement>(null);

        // eslint-disable-next-line react-hooks/incompatible-library
        const virtualizer = useVirtualizer({
            count: questions.length,
            getScrollElement: () => parentRef.current,
            // Just a rough guess – actual size will be corrected by measureElement
            estimateSize: () => 380,
            overscan: 6,
            // Keep row identity stable so React does less work
            getItemKey: (index) => questions[index]?.id ?? index,
        });

        // Expose scroll method to parent
        useImperativeHandle(ref, () => ({
            scrollToQuestion: (questionId: string) => {
                const index = questions.findIndex((q) => q.id === questionId);
                if (index !== -1) {
                    virtualizer.scrollToIndex(index, {
                        align: "center",
                        behavior: "smooth",
                    });
                }
            },
        }));

        return (
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
                        if (!question) return null;

                        return (
                            <div
                                key={question.id}
                                data-index={virtualItem.index}
                                ref={(el) => {
                                    // Let the virtualizer measure the *actual* height
                                    // so rows get dynamic size based on content
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
                                    willChange: "transform",
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
        );
    }
);

QuestionList.displayName = "QuestionList";
