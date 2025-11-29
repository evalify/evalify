"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, FileText, Calculator, Users, Info } from "lucide-react";
import { QuizMetadata } from "./quiz-metadata";
import { ScoringMethod } from "./scoring-method";
import { format, differenceInMinutes } from "date-fns";
import { QuizParticipant } from "./quiz-participant";
import { QuizParticipantData } from "./types";
import { trpc } from "@/lib/trpc/client";
import { useAnalytics } from "@/hooks/use-analytics";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ExistingQuizData = {
    id: string;
    name: string;
    description: string | null;
    instructions: string | null;
    startTime: Date;
    endTime: Date;
    duration: string;
    password: string | null;
    fullScreen: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    linearQuiz: boolean;
    calculator: boolean;
    autoSubmit: boolean;
    publishResult: boolean;
    publishQuiz: boolean;
    tags?: string[];
    studentIds?: string[];
    courseIds?: string[];
    labIds?: string[];
    batchIds?: string[];
};

type QuizCreationData = {
    metadata: {
        title: string;
        description: string;
        instructions: string;
        duration: {
            value: number;
            unit: "Minutes" | "Hours";
        };
        startDateTime: {
            date: Date | undefined;
            time: string;
        };
        endDateTime: {
            date: Date | undefined;
            time: string;
        };
        tags: string[];
        questionBreakdown: {
            easy: number;
            medium: number;
            hard: number;
            totalMarks: number;
        };
        settings: {
            passwordProtected: boolean;
            password: string;
            autoSubmit: boolean;
            calculatorAccess: boolean;
            allowTabSwitching: boolean;
            fullScreen: boolean;
            shuffleQuestions: boolean;
            shuffleOptions: boolean;
            randomizeQuestions: boolean;
            linearQuiz: boolean;
            publishResult: boolean;
            publishQuiz: boolean;
        };
    };
    scoring: {
        method?: "Standard" | "Weighted";
        pointsPerQuestion?: number;
        penalizeWrongAnswers?: boolean;
        penaltyAmount?: number;
    };
};

const tabs = [
    {
        id: "metadata",
        label: "Quiz Details",
        icon: FileText,
        description:
            "Configure quiz title, description, schedule (start/end time, duration), and security settings",
    },
    {
        id: "participants",
        label: "Participants",
        icon: Users,
        description: "Select courses, batches, students, and labs who can take this quiz",
    },
    {
        id: "scoring",
        label: "Scoring Method",
        icon: Calculator,
        description: "Configure how the quiz will be scored and graded",
    },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function QuizCreationTabs({
    courseId,
    quizId,
    existingQuiz,
}: {
    courseId: string;
    quizId?: string;
    existingQuiz?: ExistingQuizData;
}) {
    const router = useRouter();
    const [currentTab, setCurrentTab] = useState<TabId>("metadata");
    const { toast } = useToast();
    const analytics = useAnalytics();
    const isEdit = !!quizId;

    // Parse existing quiz data once using useMemo
    const initialQuizData = useMemo((): QuizCreationData => {
        if (!existingQuiz) {
            return {
                metadata: {
                    title: "",
                    description: "",
                    instructions: "",
                    duration: {
                        value: 60,
                        unit: "Minutes",
                    },
                    startDateTime: {
                        date: undefined,
                        time: "",
                    },
                    endDateTime: {
                        date: undefined,
                        time: "",
                    },
                    tags: [],
                    questionBreakdown: {
                        easy: 0,
                        medium: 0,
                        hard: 0,
                        totalMarks: 0,
                    },
                    settings: {
                        passwordProtected: false,
                        password: "",
                        autoSubmit: false,
                        calculatorAccess: false,
                        allowTabSwitching: true,
                        fullScreen: false,
                        shuffleQuestions: false,
                        shuffleOptions: false,
                        randomizeQuestions: false,
                        linearQuiz: false,
                        publishResult: false,
                        publishQuiz: false,
                    },
                },
                scoring: {
                    method: "Standard",
                    pointsPerQuestion: 1,
                    penalizeWrongAnswers: false,
                    penaltyAmount: 0,
                },
            };
        }

        // Parse dates and times from ISO strings
        const parseDateTime = (isoString: string | Date) => {
            if (!isoString) return { date: undefined, time: "" };
            const dateObj = typeof isoString === "string" ? new Date(isoString) : isoString;
            return {
                date: dateObj,
                time: format(dateObj, "HH:mm"),
            };
        };

        // Parse duration - backend returns interval string like "60 minutes"
        const parseDuration = (durationStr: string) => {
            const match = durationStr.match(/(\d+)\s*(minute|hour)/i);
            if (match) {
                const value = parseInt(match[1]);
                const unit = match[2].toLowerCase().startsWith("hour") ? "Hours" : "Minutes";
                return { value, unit: unit as "Minutes" | "Hours" };
            }
            return { value: 60, unit: "Minutes" as const };
        };

        return {
            metadata: {
                title: existingQuiz.name || "",
                description: existingQuiz.description || "",
                instructions: existingQuiz.instructions || "",
                duration: parseDuration(existingQuiz.duration || "60 minutes"),
                startDateTime: parseDateTime(existingQuiz.startTime),
                endDateTime: parseDateTime(existingQuiz.endTime),
                tags: existingQuiz.tags || [],
                questionBreakdown: {
                    easy: 0,
                    medium: 0,
                    hard: 0,
                    totalMarks: 0,
                },
                settings: {
                    passwordProtected: !!existingQuiz.password,
                    password: existingQuiz.password || "",
                    autoSubmit: existingQuiz.autoSubmit || false,
                    calculatorAccess: existingQuiz.calculator || false,
                    allowTabSwitching: true,
                    fullScreen: existingQuiz.fullScreen || false,
                    shuffleQuestions: existingQuiz.shuffleQuestions || false,
                    shuffleOptions: existingQuiz.shuffleOptions || false,
                    randomizeQuestions: false,
                    linearQuiz: existingQuiz.linearQuiz || false,
                    publishResult: existingQuiz.publishResult || false,
                    publishQuiz: existingQuiz.publishQuiz || false,
                },
            },
            scoring: {
                method: "Standard",
                pointsPerQuestion: 1,
                penalizeWrongAnswers: false,
                penaltyAmount: 0,
            },
        };
    }, [existingQuiz]);

    const initialParticipantData = useMemo((): QuizParticipantData => {
        if (!existingQuiz) {
            return {
                students: [],
                courses: [],
                labs: [],
                batches: [],
            };
        }

        return {
            students: existingQuiz.studentIds || [],
            courses: existingQuiz.courseIds || [],
            labs: existingQuiz.labIds || [],
            batches: existingQuiz.batchIds || [],
        };
    }, [existingQuiz]);

    const [quizData, setQuizData] = useState<QuizCreationData>(initialQuizData);
    const [participantData, setParticipantData] =
        useState<QuizParticipantData>(initialParticipantData);

    const utils = trpc.useUtils();

    // tRPC mutations
    const createQuizMutation = trpc.facultyQuiz.create.useMutation({
        onSuccess: (data) => {
            utils.facultyQuiz.listByCourse.invalidate({ courseId });

            toast("success", "Quiz created successfully!", {
                description: `Quiz has been created.`,
            });

            analytics.track("quiz_created", {
                quizId: data.quizId,
                courseId,
            });

            // Navigate to quiz view page
            router.push(`/course/${courseId}/quiz/${data.quizId}/view`);
        },
        onError: (err) => {
            toast("error", "Failed to create quiz", {
                description: err.message || "There was an error creating your quiz.",
            });

            analytics.track("quiz_creation_failed", {
                courseId,
                error: err.message,
            });
        },
    });

    const updateQuizMutation = trpc.facultyQuiz.update.useMutation({
        onSuccess: () => {
            utils.facultyQuiz.listByCourse.invalidate({ courseId });
            if (quizId) {
                utils.facultyQuiz.getById.invalidate({ quizId });
            }

            toast("success", "Quiz updated successfully!", {
                description: "Your quiz changes have been saved.",
            });

            analytics.track("quiz_updated", {
                quizId,
                courseId,
            });

            // Navigate to quiz view page
            router.push(`/course/${courseId}/quiz/${quizId}/view`);
        },
        onError: (err) => {
            toast("error", "Failed to update quiz", {
                description: err.message || "There was an error updating your quiz.",
            });

            analytics.track("quiz_update_failed", {
                quizId,
                courseId,
                error: err.message,
            });
        },
    });

    // Update URL when tab changes
    const handleTabChange = (value: string) => {
        setCurrentTab(value as TabId);
    };

    // Update specific section data
    const updateMetadata = (data: QuizCreationData["metadata"]) => {
        setQuizData((prev) => ({ ...prev, metadata: data }));
    };

    const updateScoring = (data: QuizCreationData["scoring"]) => {
        setQuizData((prev) => ({ ...prev, scoring: data }));
    };

    // Validation helper functions
    const validateQuizData = () => {
        const validationErrors: string[] = [];
        const { metadata } = quizData;

        // Check required fields
        if (!metadata.title.trim()) {
            validationErrors.push("Quiz title is required");
        }

        if (!metadata.startDateTime.date) {
            validationErrors.push("Start date is required");
        }

        if (!metadata.startDateTime.time) {
            validationErrors.push("Start time is required");
        }

        if (!metadata.endDateTime.date) {
            validationErrors.push("End date is required");
        }

        if (!metadata.endDateTime.time) {
            validationErrors.push("End time is required");
        }

        if (!metadata.duration.value || metadata.duration.value <= 0) {
            validationErrors.push("Duration must be greater than 0");
        }

        // If we have all date/time fields, validate them
        if (
            metadata.startDateTime.date &&
            metadata.startDateTime.time &&
            metadata.endDateTime.date &&
            metadata.endDateTime.time &&
            metadata.duration.value > 0
        ) {
            try {
                // Create full datetime objects
                const startDateTime = new Date(
                    `${format(metadata.startDateTime.date, "yyyy-MM-dd")}T${metadata.startDateTime.time}`
                );
                const endDateTime = new Date(
                    `${format(metadata.endDateTime.date, "yyyy-MM-dd")}T${metadata.endDateTime.time}`
                );

                // Check if end time is after start time
                if (endDateTime <= startDateTime) {
                    validationErrors.push("End time must be after start time");
                }

                // Calculate actual duration between start and end
                const actualDurationMinutes = differenceInMinutes(endDateTime, startDateTime);

                // Convert specified duration to minutes
                const specifiedDurationMinutes =
                    metadata.duration.unit === "Hours"
                        ? metadata.duration.value * 60
                        : metadata.duration.value;

                // Check if the time window is sufficient for the quiz duration
                if (actualDurationMinutes < specifiedDurationMinutes) {
                    validationErrors.push(
                        `Time window (${actualDurationMinutes} minutes) is shorter than quiz duration (${specifiedDurationMinutes} minutes)`
                    );
                }

                // Optional: Check if start time is in the past (uncomment if needed)
                const now = new Date();
                if (startDateTime < now) {
                    validationErrors.push("Start time cannot be in the past");
                }
            } catch (error) {
                validationErrors.push("Invalid date or time format");
                console.error("Date validation error:", error);
            }
        }

        return validationErrors;
    };

    // Save quiz data with validation and API call
    const handleSave = async () => {
        const validationErrors = validateQuizData();

        if (validationErrors.length > 0) {
            const errorMessage =
                validationErrors.length === 1
                    ? validationErrors[0]
                    : `Please fix ${validationErrors.length} validation errors`;

            toast("error", errorMessage, {
                description: validationErrors.length > 1 ? validationErrors.join(" • ") : undefined,
            });
            return;
        }

        // Transform data to match backend DTO structure
        const meta = quizData.metadata;

        if (isEdit && quizId) {
            // Update existing quiz
            const startTime =
                meta.startDateTime.date && meta.startDateTime.time
                    ? new Date(
                          `${format(meta.startDateTime.date, "yyyy-MM-dd")}T${meta.startDateTime.time}`
                      )
                    : new Date();
            const endTime =
                meta.endDateTime.date && meta.endDateTime.time
                    ? new Date(
                          `${format(meta.endDateTime.date, "yyyy-MM-dd")}T${meta.endDateTime.time}`
                      )
                    : new Date();
            const durationInMinutes =
                meta.duration.unit === "Hours" ? meta.duration.value * 60 : meta.duration.value;

            updateQuizMutation.mutate({
                quizId,
                name: meta.title,
                description: meta.description,
                instructions: meta.instructions,
                startTime,
                endTime,
                durationInMinutes,
                password: meta.settings.passwordProtected ? meta.settings.password : undefined,
                fullScreen: meta.settings.fullScreen,
                shuffleQuestions: meta.settings.shuffleQuestions,
                shuffleOptions: meta.settings.shuffleOptions,
                linearQuiz: meta.settings.linearQuiz,
                calculator: meta.settings.calculatorAccess,
                autoSubmit: meta.settings.autoSubmit,
                publishResult: meta.settings.publishResult,
                publishQuiz: meta.settings.publishQuiz,
                quizTags: meta.tags,
                courseIds: participantData.courses,
                studentIds: participantData.students,
                labIds: participantData.labs,
                batchIds: participantData.batches,
            });
        } else {
            // Create new quiz
            const startTime =
                meta.startDateTime.date && meta.startDateTime.time
                    ? new Date(
                          `${format(meta.startDateTime.date, "yyyy-MM-dd")}T${meta.startDateTime.time}`
                      )
                    : new Date();
            const endTime =
                meta.endDateTime.date && meta.endDateTime.time
                    ? new Date(
                          `${format(meta.endDateTime.date, "yyyy-MM-dd")}T${meta.endDateTime.time}`
                      )
                    : new Date();
            const durationInMinutes =
                meta.duration.unit === "Hours" ? meta.duration.value * 60 : meta.duration.value;

            createQuizMutation.mutate({
                courseId,
                name: meta.title,
                description: meta.description,
                instructions: meta.instructions,
                startTime,
                endTime,
                durationInMinutes,
                password: meta.settings.passwordProtected ? meta.settings.password : undefined,
                fullScreen: meta.settings.fullScreen,
                shuffleQuestions: meta.settings.shuffleQuestions,
                shuffleOptions: meta.settings.shuffleOptions,
                linearQuiz: meta.settings.linearQuiz,
                calculator: meta.settings.calculatorAccess,
                autoSubmit: meta.settings.autoSubmit,
                publishResult: meta.settings.publishResult,
                publishQuiz: meta.settings.publishQuiz,
                quizTags: meta.tags,
                courseIds: participantData.courses,
                studentIds: participantData.students,
                labIds: participantData.labs,
                batchIds: participantData.batches,
            });
        }
    };

    return (
        <TooltipProvider>
            <div className="w-full">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                                {isEdit ? "Edit Quiz" : "Create Quiz"}
                            </h1>
                            <p className="text-sm sm:text-base text-muted-foreground">
                                {isEdit
                                    ? "Update your quiz configuration, scoring method, and publishing settings."
                                    : "Set up your quiz by configuring the details, scoring method, and publishing settings."}
                            </p>
                        </div>
                        <Button
                            onClick={handleSave}
                            className="flex items-center gap-2 shrink-0"
                            size="default"
                            disabled={createQuizMutation.isPending || updateQuizMutation.isPending}
                        >
                            <Save className="h-4 w-4" />
                            {createQuizMutation.isPending || updateQuizMutation.isPending
                                ? isEdit
                                    ? "Updating..."
                                    : "Saving..."
                                : isEdit
                                  ? "Update Quiz"
                                  : "Save Quiz"}
                        </Button>
                    </div>

                    {/* Tabs Container */}
                    <Card>
                        <CardContent className="p-6">
                            <Tabs
                                value={currentTab}
                                onValueChange={handleTabChange}
                                className="space-y-6"
                            >
                                <TabsList className="grid w-full grid-cols-3 h-auto p-1 gap-0">
                                    {tabs.map((tab, index) => {
                                        const Icon = tab.icon;
                                        return (
                                            <div key={tab.id} className="flex items-stretch h-full">
                                                <TabsTrigger
                                                    value={tab.id}
                                                    className="flex-1 flex flex-col items-center justify-center gap-2 py-3 px-2 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-h-[60px] sm:min-h-20"
                                                >
                                                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                                                    <div className="text-center w-full">
                                                        <div className="font-medium text-xs sm:text-sm flex items-center justify-center gap-1 flex-wrap">
                                                            <span className="whitespace-normal wrap-break-word">
                                                                {tab.label}
                                                            </span>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Info className="h-3 w-3 text-muted-foreground cursor-help shrink-0" />
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-xs">
                                                                    <p>{tab.description}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground hidden lg:block mt-1 whitespace-normal wrap-break-word">
                                                            {tab.description}
                                                        </div>
                                                    </div>
                                                </TabsTrigger>
                                                {index < tabs.length - 1 && (
                                                    <div className="w-px bg-border" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </TabsList>
                                <TabsContent value="metadata" className="space-y-6 mt-6">
                                    <QuizMetadata
                                        data={quizData.metadata}
                                        updateData={updateMetadata}
                                    />
                                </TabsContent>
                                <TabsContent value="participants" className="space-y-6 mt-6">
                                    <QuizParticipant
                                        data={participantData}
                                        updateData={setParticipantData}
                                    />
                                </TabsContent>

                                <TabsContent value="scoring" className="space-y-6 mt-6">
                                    <Card className="w-full">
                                        <CardHeader className="px-4 sm:px-6">
                                            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                                <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
                                                Scoring Method
                                            </CardTitle>
                                            <CardDescription className="text-sm">
                                                Define how questions will be scored and whether to
                                                apply penalties for wrong answers.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="px-4 sm:px-6">
                                            <ScoringMethod
                                                data={quizData.scoring}
                                                updateData={updateScoring}
                                            />
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TooltipProvider>
    );
}
