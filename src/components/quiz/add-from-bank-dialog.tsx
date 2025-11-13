"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import { QuestionRender } from "@/components/question/question-renderer";
import type { Question } from "@/types/questions";
import {
    ChevronLeft,
    ChevronRight,
    Loader2,
    Library,
    Filter,
    CheckSquare,
    Eye,
    BookOpen,
    Tag,
    TrendingUp,
    FileQuestion,
    Check,
    Search,
    Sparkles,
    X,
    Settings2,
    ListFilter,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type AddFromBankDialogProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    quizId: string;
    courseId: string;
    sectionId?: string;
};

type FilterOptions = {
    bankId: string;
    topicIds: string[];
    difficulty: string[];
    questionTypes: string[];
    createdBy: string;
    limit: number;
};

export function AddFromBankDialog({
    isOpen,
    onOpenChange,
    quizId,
    courseId,
    sectionId,
}: AddFromBankDialogProps) {
    const { success, error } = useToast();
    const { track } = useAnalytics();
    const utils = trpc.useUtils();

    const [step, setStep] = useState(1);
    const [filters, setFilters] = useState<FilterOptions>({
        bankId: "",
        topicIds: [],
        difficulty: [],
        questionTypes: [],
        createdBy: "any",
        limit: 50,
    });
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
    const [topicSearch, setTopicSearch] = useState("");

    // Fetch banks
    const { data: banksData, isLoading: banksLoading } = trpc.bank.list.useQuery({
        limit: 100,
        offset: 0,
    });

    // Fetch bank details (topics)
    const { data: bankDetails } = trpc.bank.get.useQuery(
        { id: filters.bankId },
        { enabled: !!filters.bankId }
    );

    // Fetch all bankQuestionIds from the quiz (across all sections) to filter them out
    const { data: existingBankQuestionIds } = trpc.section.getAllQuizBankQuestionIds.useQuery(
        {
            quizId,
            courseId,
        },
        { enabled: isOpen }
    );

    // Fetch filtered questions
    const { data: questionsData, isLoading: questionsLoading } =
        trpc.question.listByTopics.useQuery(
            {
                bankId: filters.bankId,
                topicIds: filters.topicIds.length > 0 ? filters.topicIds : [],
                limit: filters.limit,
                offset: 0,
            },
            { enabled: step === 2 && !!filters.bankId }
        );

    // Add questions mutation
    const addQuestionsMutation = trpc.question.addQuestionsFromBank.useMutation({
        onSuccess: () => {
            success("Questions added successfully!");
            utils.section.listQuestionsInSection.invalidate();
            track("questions_added_from_bank", { quizId, count: selectedQuestionIds.length });
            handleClose();
        },
        onError: (err) => {
            error(err.message || "Failed to add questions");
        },
    });

    const handleClose = () => {
        setStep(1);
        setFilters({
            bankId: "",
            topicIds: [],
            difficulty: [],
            questionTypes: [],
            createdBy: "any",
            limit: 50,
        });
        setSelectedQuestionIds([]);
        setTopicSearch("");
        onOpenChange(false);
    };

    const handleNext = () => {
        if (step === 1) {
            if (!filters.bankId) {
                error("Please select a question bank");
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (selectedQuestionIds.length === 0) {
                error("Please select at least one question");
                return;
            }
            setStep(3);
        }
    };

    const handleBack = () => {
        setStep(step - 1);
    };

    const handleAddQuestions = () => {
        addQuestionsMutation.mutate({
            quizId,
            courseId,
            sectionId: sectionId || null,
            bankQuestionIds: selectedQuestionIds,
        });
    };

    const toggleQuestionSelection = (questionId: string) => {
        setSelectedQuestionIds((prev) =>
            prev.includes(questionId)
                ? prev.filter((id) => id !== questionId)
                : [...prev, questionId]
        );
    };

    const toggleSelectAll = () => {
        if (!filteredQuestions) return;
        const bankQuestionIds = filteredQuestions
            .map((q) => q.bankQuestionId)
            .filter((id): id is string => !!id);
        if (selectedQuestionIds.length === bankQuestionIds.length) {
            setSelectedQuestionIds([]);
        } else {
            setSelectedQuestionIds(bankQuestionIds);
        }
    };

    // Get already added bankQuestionIds as a Set for fast lookup
    const alreadyAddedBankQuestionIds = useMemo(() => {
        if (!existingBankQuestionIds) return new Set<string>();
        console.log("🔍 Existing bank question IDs from quiz:", existingBankQuestionIds);
        return new Set(existingBankQuestionIds);
    }, [existingBankQuestionIds]);

    // Apply client-side filters using OR logic within each category and exclude already added questions
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const filteredQuestions = useMemo(() => {
        if (!questionsData) return [];

        console.log("📊 Total questions fetched from bank:", questionsData.length);
        console.log("🚫 Questions to exclude (count):", alreadyAddedBankQuestionIds.size);

        const filtered = questionsData.filter((question) => {
            // Filter out already added questions
            const bankQuestionId =
                typeof question.bankQuestionId === "string" ? question.bankQuestionId : null;
            if (bankQuestionId && alreadyAddedBankQuestionIds.has(bankQuestionId)) {
                console.log("❌ Filtering out duplicate question:", bankQuestionId);
                return false;
            }

            // If no filters are applied, show all questions
            const hasDifficultyFilter = filters.difficulty.length > 0;
            const hasTypeFilter = filters.questionTypes.length > 0;

            // If no filters at all, show everything
            if (!hasDifficultyFilter && !hasTypeFilter) {
                return true;
            }

            let matchesDifficulty = true;
            let matchesType = true;

            // Check difficulty - if filter is set, must match at least one
            if (hasDifficultyFilter) {
                const difficultyValue =
                    typeof question.difficulty === "string" ? question.difficulty : null;
                matchesDifficulty = difficultyValue
                    ? filters.difficulty.includes(difficultyValue)
                    : false;
            }

            // Check question type - if filter is set, must match at least one
            if (hasTypeFilter) {
                const typeValue = typeof question.type === "string" ? question.type : null;
                matchesType = typeValue ? filters.questionTypes.includes(typeValue) : false;
            }

            // Both conditions must pass (AND between categories, OR within categories)
            return matchesDifficulty && matchesType;
        });

        console.log("✅ Questions after filtering:", filtered.length);
        return filtered;
    }, [questionsData, filters.difficulty, filters.questionTypes, alreadyAddedBankQuestionIds]);

    // Filter topics by search
    const filteredTopics = useMemo(() => {
        if (!bankDetails?.topics) return [];
        if (!topicSearch) return bankDetails.topics;
        return bankDetails.topics.filter((topic) =>
            topic.name.toLowerCase().includes(topicSearch.toLowerCase())
        );
    }, [bankDetails, topicSearch]);

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="!max-w-[98vw] w-[98vw] h-[98vh] flex flex-col p-0 gap-0 overflow-auto">
                {/* Header with gradient */}
                <div className="relative overflow-hidden border-b bg-background z-10 shrink-0">
                    <div className="absolute inset-0 bg-linear-to-br from-primary/20 via-primary/10 to-transparent" />
                    <div className="relative px-8 pt-6 pb-4 z-10">
                        <DialogHeader>
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-2xl bg-linear-to-br from-primary to-primary/80 shadow-lg">
                                        <Library className="h-7 w-7 text-primary-foreground" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-3xl font-bold bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
                                            Add Questions from Bank
                                        </DialogTitle>
                                        <DialogDescription className="mt-2 text-base">
                                            {step === 1
                                                ? "Select a question bank and apply filters to find the perfect questions"
                                                : step === 2
                                                  ? "Choose questions to add to your quiz"
                                                  : "Review and confirm your selection"}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </div>
                        </DialogHeader>

                        {/* Progress Steps */}
                        <div className="flex items-center justify-center gap-3 mb-6">
                            {[
                                { num: 1, icon: Settings2, label: "Configure" },
                                { num: 2, icon: CheckSquare, label: "Select" },
                                { num: 3, icon: Eye, label: "Review" },
                            ].map(({ num, icon: Icon, label }) => (
                                <div key={num} className="flex items-center gap-3">
                                    <div className="flex flex-col items-center gap-2">
                                        <div
                                            className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ${
                                                num === step
                                                    ? "bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-lg scale-110"
                                                    : num < step
                                                      ? "bg-linear-to-br from-primary/20 to-primary/10 text-primary border-2 border-primary/30"
                                                      : "bg-muted text-muted-foreground border-2 border-border"
                                            }`}
                                        >
                                            {num < step ? (
                                                <Check className="h-6 w-6" />
                                            ) : (
                                                <Icon className="h-6 w-6" />
                                            )}
                                        </div>
                                        <span
                                            className={`text-sm font-medium transition-colors ${
                                                num <= step
                                                    ? "text-foreground"
                                                    : "text-muted-foreground"
                                            }`}
                                        >
                                            {label}
                                        </span>
                                    </div>
                                    {num < 3 && (
                                        <div
                                            className={`w-24 h-1 rounded-full transition-all duration-300 ${
                                                num < step
                                                    ? "bg-linear-to-r from-primary to-primary/80"
                                                    : "bg-border"
                                            }`}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Navigation buttons */}
                        <div className="flex items-center justify-between pt-2 border-t">
                            <div>
                                {step > 1 ? (
                                    <Button
                                        variant="outline"
                                        onClick={handleBack}
                                        className="rounded-full"
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-2" />
                                        Back
                                    </Button>
                                ) : (
                                    <div />
                                )}
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={handleClose}
                                    className="rounded-full"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                                {step < 3 ? (
                                    <Button
                                        onClick={handleNext}
                                        className="rounded-full min-w-[140px] bg-linear-to-r from-primary to-primary/90 shadow-lg hover:shadow-xl transition-all"
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4 ml-2" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleAddQuestions}
                                        disabled={addQuestionsMutation.isPending}
                                        className="rounded-full min-w-[140px] bg-linear-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg hover:shadow-xl transition-all"
                                    >
                                        {addQuestionsMutation.isPending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Adding...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="h-4 w-4 mr-2" />
                                                Add Questions
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <ScrollArea className="flex-1">
                    <div className="px-8 py-6 max-w-7xl mx-auto">
                        {step === 1 && (
                            <div className="space-y-8">
                                {/* Bank Selection Card */}
                                <Card className="border-2 shadow-lg overflow-hidden">
                                    <div className="bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 px-6 py-4 border-b">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-500/10">
                                                <Library className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg">
                                                    Question Bank
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Choose the source bank for your questions
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <CardContent className="p-6">
                                        {banksLoading ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            </div>
                                        ) : (
                                            <Select
                                                value={filters.bankId}
                                                onValueChange={(value) =>
                                                    setFilters({ ...filters, bankId: value })
                                                }
                                            >
                                                <SelectTrigger className="w-full h-12 rounded-xl border-2 hover:border-primary/50 transition-colors">
                                                    <SelectValue placeholder="Select a question bank" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {banksData?.rows.map((bank) => (
                                                        <SelectItem key={bank.id} value={bank.id}>
                                                            <div className="flex items-center gap-3">
                                                                <BookOpen className="h-4 w-4 text-primary" />
                                                                <div>
                                                                    <div className="font-medium">
                                                                        {bank.name}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {bank.courseCode ||
                                                                            "No course code"}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Filters Grid */}
                                {filters.bankId && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Topics Filter */}
                                        <Card className="border-2 shadow-lg overflow-hidden">
                                            <div className="bg-linear-to-r from-indigo-500/10 to-blue-500/10 px-6 py-4 border-b">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-indigo-500/10">
                                                            <Tag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold">
                                                                Topics
                                                            </h3>
                                                            <p className="text-xs text-muted-foreground">
                                                                Filter by subject topics
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Badge
                                                        variant={
                                                            filters.topicIds.length === 0
                                                                ? "secondary"
                                                                : "default"
                                                        }
                                                        className="rounded-full"
                                                    >
                                                        {filters.topicIds.length === 0
                                                            ? "Any"
                                                            : `${filters.topicIds.length} selected`}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <CardContent className="p-6 space-y-4">
                                                {/* Search */}
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Search topics..."
                                                        value={topicSearch}
                                                        onChange={(e) =>
                                                            setTopicSearch(e.target.value)
                                                        }
                                                        className="pl-9 rounded-xl border-2 h-10"
                                                    />
                                                </div>

                                                {/* Any option */}
                                                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                                                    <Checkbox
                                                        id="topic-any"
                                                        checked={filters.topicIds.length === 0}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setFilters({
                                                                    ...filters,
                                                                    topicIds: [],
                                                                });
                                                            }
                                                        }}
                                                        className="h-5 w-5"
                                                    />
                                                    <Label
                                                        htmlFor="topic-any"
                                                        className="font-medium cursor-pointer flex-1"
                                                    >
                                                        Any (All Topics)
                                                    </Label>
                                                </div>

                                                <Separator />

                                                {/* Topics list */}
                                                <ScrollArea className="h-[300px]">
                                                    <div className="space-y-2 pr-4">
                                                        {filteredTopics.length === 0 ? (
                                                            <p className="text-sm text-muted-foreground text-center py-8">
                                                                No topics found
                                                            </p>
                                                        ) : (
                                                            filteredTopics.map((topic) => (
                                                                <div
                                                                    key={topic.id}
                                                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                                                                >
                                                                    <Checkbox
                                                                        id={`topic-${topic.id}`}
                                                                        checked={filters.topicIds.includes(
                                                                            topic.id
                                                                        )}
                                                                        onCheckedChange={(
                                                                            checked
                                                                        ) => {
                                                                            if (checked) {
                                                                                setFilters({
                                                                                    ...filters,
                                                                                    topicIds: [
                                                                                        ...filters.topicIds,
                                                                                        topic.id,
                                                                                    ],
                                                                                });
                                                                            } else {
                                                                                setFilters({
                                                                                    ...filters,
                                                                                    topicIds:
                                                                                        filters.topicIds.filter(
                                                                                            (t) =>
                                                                                                t !==
                                                                                                topic.id
                                                                                        ),
                                                                                });
                                                                            }
                                                                        }}
                                                                        className="h-5 w-5"
                                                                    />
                                                                    <Label
                                                                        htmlFor={`topic-${topic.id}`}
                                                                        className="cursor-pointer flex-1 text-sm"
                                                                    >
                                                                        {topic.name}
                                                                    </Label>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            </CardContent>
                                        </Card>

                                        {/* Difficulty & Type Filters */}
                                        <div className="space-y-6">
                                            {/* Difficulty Filter */}
                                            <Card className="border-2 shadow-lg overflow-hidden">
                                                <div className="bg-linear-to-r from-orange-500/10 to-yellow-500/10 px-6 py-4 border-b">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-orange-500/10">
                                                                <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                                            </div>
                                                            <div>
                                                                <h3 className="font-semibold">
                                                                    Difficulty
                                                                </h3>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Filter by complexity
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Badge
                                                            variant={
                                                                filters.difficulty.length === 0
                                                                    ? "secondary"
                                                                    : "default"
                                                            }
                                                            className="rounded-full"
                                                        >
                                                            {filters.difficulty.length === 0
                                                                ? "Any"
                                                                : `${filters.difficulty.length} selected`}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <CardContent className="p-6 space-y-3">
                                                    {/* Any option */}
                                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                                                        <Checkbox
                                                            id="difficulty-any"
                                                            checked={
                                                                filters.difficulty.length === 0
                                                            }
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setFilters({
                                                                        ...filters,
                                                                        difficulty: [],
                                                                    });
                                                                }
                                                            }}
                                                            className="h-5 w-5"
                                                        />
                                                        <Label
                                                            htmlFor="difficulty-any"
                                                            className="font-medium cursor-pointer flex-1"
                                                        >
                                                            Any (All Levels)
                                                        </Label>
                                                    </div>

                                                    <Separator />

                                                    {["EASY", "MEDIUM", "HARD"].map((diff) => (
                                                        <div
                                                            key={diff}
                                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                                                        >
                                                            <Checkbox
                                                                id={`diff-${diff}`}
                                                                checked={filters.difficulty.includes(
                                                                    diff
                                                                )}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        setFilters({
                                                                            ...filters,
                                                                            difficulty: [
                                                                                ...filters.difficulty,
                                                                                diff,
                                                                            ],
                                                                        });
                                                                    } else {
                                                                        setFilters({
                                                                            ...filters,
                                                                            difficulty:
                                                                                filters.difficulty.filter(
                                                                                    (d) =>
                                                                                        d !== diff
                                                                                ),
                                                                        });
                                                                    }
                                                                }}
                                                                className="h-5 w-5"
                                                            />
                                                            <Label
                                                                htmlFor={`diff-${diff}`}
                                                                className="cursor-pointer flex-1"
                                                            >
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`${
                                                                        diff === "EASY"
                                                                            ? "border-green-500 text-green-600 dark:text-green-400"
                                                                            : diff === "MEDIUM"
                                                                              ? "border-yellow-500 text-yellow-600 dark:text-yellow-400"
                                                                              : "border-red-500 text-red-600 dark:text-red-400"
                                                                    }`}
                                                                >
                                                                    {diff}
                                                                </Badge>
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </CardContent>
                                            </Card>

                                            {/* Question Types Filter */}
                                            <Card className="border-2 shadow-lg overflow-hidden">
                                                <div className="bg-linear-to-r from-purple-500/10 to-pink-500/10 px-6 py-4 border-b">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-purple-500/10">
                                                                <FileQuestion className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                                            </div>
                                                            <div>
                                                                <h3 className="font-semibold">
                                                                    Question Types
                                                                </h3>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Filter by format
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Badge
                                                            variant={
                                                                filters.questionTypes.length === 0
                                                                    ? "secondary"
                                                                    : "default"
                                                            }
                                                            className="rounded-full"
                                                        >
                                                            {filters.questionTypes.length === 0
                                                                ? "Any"
                                                                : `${filters.questionTypes.length} selected`}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <CardContent className="p-6 space-y-3">
                                                    {/* Any option */}
                                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                                                        <Checkbox
                                                            id="type-any"
                                                            checked={
                                                                filters.questionTypes.length === 0
                                                            }
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setFilters({
                                                                        ...filters,
                                                                        questionTypes: [],
                                                                    });
                                                                }
                                                            }}
                                                            className="h-5 w-5"
                                                        />
                                                        <Label
                                                            htmlFor="type-any"
                                                            className="font-medium cursor-pointer flex-1"
                                                        >
                                                            Any (All Types)
                                                        </Label>
                                                    </div>

                                                    <Separator />

                                                    <ScrollArea className="h-[200px]">
                                                        <div className="space-y-2 pr-4">
                                                            {[
                                                                "MCQ",
                                                                "MMCQ",
                                                                "TRUE_FALSE",
                                                                "DESCRIPTIVE",
                                                                "FILL_THE_BLANK",
                                                                "MATCHING",
                                                                "FILE_UPLOAD",
                                                                "CODING",
                                                            ].map((type) => (
                                                                <div
                                                                    key={type}
                                                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                                                                >
                                                                    <Checkbox
                                                                        id={`type-${type}`}
                                                                        checked={filters.questionTypes.includes(
                                                                            type
                                                                        )}
                                                                        onCheckedChange={(
                                                                            checked
                                                                        ) => {
                                                                            if (checked) {
                                                                                setFilters({
                                                                                    ...filters,
                                                                                    questionTypes: [
                                                                                        ...filters.questionTypes,
                                                                                        type,
                                                                                    ],
                                                                                });
                                                                            } else {
                                                                                setFilters({
                                                                                    ...filters,
                                                                                    questionTypes:
                                                                                        filters.questionTypes.filter(
                                                                                            (t) =>
                                                                                                t !==
                                                                                                type
                                                                                        ),
                                                                                });
                                                                            }
                                                                        }}
                                                                        className="h-5 w-5"
                                                                    />
                                                                    <Label
                                                                        htmlFor={`type-${type}`}
                                                                        className="cursor-pointer flex-1 text-sm"
                                                                    >
                                                                        {type.replace(/_/g, " ")}
                                                                    </Label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </ScrollArea>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 2: Select Questions */}
                        {step === 2 && (
                            <div className="space-y-6">
                                {/* Selection Header */}
                                <Card className="border-2 shadow-lg">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-linear-to-br from-primary/20 to-primary/10">
                                                    <ListFilter className="h-6 w-6 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-semibold">
                                                        {filteredQuestions?.length || 0} Questions
                                                        Available
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {selectedQuestionIds.length} selected
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={toggleSelectAll}
                                                variant="outline"
                                                className="rounded-full"
                                            >
                                                {selectedQuestionIds.length ===
                                                filteredQuestions?.length
                                                    ? "Deselect All"
                                                    : "Select All"}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Questions Grid */}
                                {questionsLoading ? (
                                    <div className="flex flex-col items-center justify-center py-24">
                                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                                        <p className="text-muted-foreground">
                                            Loading questions...
                                        </p>
                                    </div>
                                ) : filteredQuestions && filteredQuestions.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-6">
                                        {filteredQuestions.map((question, index) => {
                                            const bankQId =
                                                typeof question.bankQuestionId === "string"
                                                    ? question.bankQuestionId
                                                    : null;
                                            const qId =
                                                typeof question.id === "string"
                                                    ? question.id
                                                    : null;
                                            const questionId =
                                                bankQId ?? qId ?? `question-${index}`;
                                            const isSelected =
                                                selectedQuestionIds.includes(questionId);
                                            return (
                                                <Card
                                                    key={questionId}
                                                    className={`transition-all duration-200 cursor-pointer border-2 ${
                                                        isSelected
                                                            ? "border-primary shadow-lg shadow-primary/20 bg-linear-to-br from-primary/5 to-transparent"
                                                            : "border-border hover:border-primary/30 hover:shadow-md"
                                                    }`}
                                                    onClick={() =>
                                                        toggleQuestionSelection(questionId)
                                                    }
                                                >
                                                    <CardContent className="p-6">
                                                        <div className="flex gap-6">
                                                            {/* Checkbox and Number */}
                                                            <div className="flex flex-col items-center gap-3 pt-1">
                                                                <Checkbox
                                                                    checked={isSelected}
                                                                    onCheckedChange={() =>
                                                                        toggleQuestionSelection(
                                                                            questionId
                                                                        )
                                                                    }
                                                                    className="h-6 w-6"
                                                                    onClick={(e) =>
                                                                        e.stopPropagation()
                                                                    }
                                                                />
                                                                <Badge
                                                                    variant="outline"
                                                                    className="rounded-full w-10 h-10 flex items-center justify-center font-semibold"
                                                                >
                                                                    {index + 1}
                                                                </Badge>
                                                            </div>

                                                            {/* Question Content */}
                                                            <div className="flex-1 min-w-0">
                                                                <QuestionRender
                                                                    question={
                                                                        question as unknown as Question
                                                                    }
                                                                    questionNumber={index + 1}
                                                                    showMetadata={true}
                                                                    showSolution={false}
                                                                    showExplanation={false}
                                                                    isReadOnly={true}
                                                                    compareWithStudentAnswer={false}
                                                                />
                                                            </div>

                                                            {/* Selection Indicator */}
                                                            {isSelected && (
                                                                <div className="flex items-start pt-1">
                                                                    <div className="p-2.5 bg-linear-to-br from-primary to-primary/80 rounded-xl shadow-lg">
                                                                        <Check className="h-5 w-5 text-primary-foreground" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <Card className="border-2 border-dashed">
                                        <CardContent className="flex flex-col items-center justify-center py-24">
                                            <div className="p-6 bg-muted/50 rounded-full mb-6">
                                                <Search className="h-16 w-16 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-xl font-semibold mb-2">
                                                No questions found
                                            </h3>
                                            <p className="text-muted-foreground text-center max-w-md">
                                                {alreadyAddedBankQuestionIds.size > 0
                                                    ? "All matching questions have already been added to this quiz. Try adjusting your filters."
                                                    : "Try adjusting your filters to find more questions."}
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}

                        {/* Step 3: Review */}
                        {step === 3 && (
                            <div className="space-y-6 max-w-5xl mx-auto">
                                {/* Summary Header */}
                                <Card className="border-2 shadow-xl overflow-hidden">
                                    <div className="bg-linear-to-r from-green-500/20 via-blue-500/20 to-purple-500/20 p-8">
                                        <div className="flex items-center gap-4">
                                            <div className="p-4 rounded-2xl bg-linear-to-br from-green-500 to-green-600 shadow-lg">
                                                <Sparkles className="h-8 w-8 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-bold">
                                                    Ready to Add Questions!
                                                </h3>
                                                <p className="text-muted-foreground mt-1">
                                                    Review your selection before adding to the quiz
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {/* Summary Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Bank Info */}
                                    <Card className="border-2 shadow-lg hover:shadow-xl transition-all overflow-hidden">
                                        <div className="bg-linear-to-br from-blue-500/10 to-purple-500/10 px-6 py-4 border-b">
                                            <div className="flex items-center gap-2">
                                                <Library className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                <h4 className="font-semibold">Source Bank</h4>
                                            </div>
                                        </div>
                                        <CardContent className="p-6">
                                            <p className="text-xl font-semibold mb-1">
                                                {banksData?.rows.find(
                                                    (b) => b.id === filters.bankId
                                                )?.name || "N/A"}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {banksData?.rows.find(
                                                    (b) => b.id === filters.bankId
                                                )?.courseCode || "No course code"}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* Questions Count */}
                                    <Card className="border-2 shadow-lg hover:shadow-xl transition-all overflow-hidden">
                                        <div className="bg-linear-to-br from-green-500/10 to-emerald-500/10 px-6 py-4 border-b">
                                            <div className="flex items-center gap-2">
                                                <CheckSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                <h4 className="font-semibold">Total Questions</h4>
                                            </div>
                                        </div>
                                        <CardContent className="p-6">
                                            <p className="text-4xl font-bold bg-linear-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                                {selectedQuestionIds.length}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {selectedQuestionIds.length === 1
                                                    ? "question"
                                                    : "questions"}{" "}
                                                to be added
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Filters Applied */}
                                <Card className="border-2 shadow-lg">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center gap-2">
                                            <Filter className="h-5 w-5 text-blue-500" />
                                            <CardTitle>Filters Applied</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-5">
                                        {/* Topics */}
                                        {filters.topicIds.length > 0 && (
                                            <div>
                                                <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                                                    <Tag className="h-4 w-4 text-indigo-500" />
                                                    Topics
                                                </Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {filters.topicIds.map((topicId) => (
                                                        <Badge
                                                            key={topicId}
                                                            className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                                        >
                                                            {topicId}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Difficulty */}
                                        {filters.difficulty.length > 0 && (
                                            <div>
                                                <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                                                    <TrendingUp className="h-4 w-4 text-orange-500" />
                                                    Difficulty
                                                </Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {filters.difficulty.map((diff) => (
                                                        <Badge
                                                            key={diff}
                                                            variant="outline"
                                                            className={`px-3 py-1 rounded-full ${
                                                                diff === "EASY"
                                                                    ? "border-green-500 text-green-600 dark:text-green-400 bg-green-500/10"
                                                                    : diff === "MEDIUM"
                                                                      ? "border-yellow-500 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10"
                                                                      : "border-red-500 text-red-600 dark:text-red-400 bg-red-500/10"
                                                            }`}
                                                        >
                                                            {diff}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Question Types */}
                                        {filters.questionTypes.length > 0 && (
                                            <div>
                                                <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                                                    <FileQuestion className="h-4 w-4 text-purple-500" />
                                                    Question Types
                                                </Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {filters.questionTypes.map((type) => (
                                                        <Badge
                                                            key={type}
                                                            className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                                        >
                                                            {type.replace(/_/g, " ")}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* No Filters */}
                                        {filters.topicIds.length === 0 &&
                                            filters.difficulty.length === 0 &&
                                            filters.questionTypes.length === 0 && (
                                                <p className="text-sm text-muted-foreground text-center py-8 bg-muted/30 rounded-xl">
                                                    No filters applied - showing all available
                                                    questions from the selected bank
                                                </p>
                                            )}
                                    </CardContent>
                                </Card>

                                {/* Destination */}
                                {sectionId && (
                                    <Card className="border-2 border-dashed shadow-lg">
                                        <CardContent className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-blue-500/10">
                                                    <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Questions will be added to
                                                    </p>
                                                    <p className="font-semibold text-lg">
                                                        Selected Section
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
