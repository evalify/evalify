"use client";

import { use, useMemo, useEffect, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import {
    Clock,
    MapPin,
    Calendar,
    Monitor,
    Shield,
    Shuffle,
    Calculator,
    FileText,
    Eye,
    Lock,
    Timer,
    AlertTriangle,
    Info,
    CheckCircle,
    Play,
    User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc/client";

type Props = {
    params: Promise<{
        quizId: string;
    }>;
};

const QuizInstructionsPage = (props: Props) => {
    const { params } = props;
    const { quizId } = use(params);
    const router = useRouter();
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [password, setPassword] = useState("");
    const { success, error: showErrorToast } = useToast();
    const [isStarting, setIsStarting] = useState(false);

    const {
        data: quizData,
        error,
        refetch,
    } = trpc.studentQuiz.getById.useQuery({
        quizId,
    });

    // TODO: Implement start quiz mutation with tRPC
    const startQuiz = async (password?: string) => {
        setIsStarting(true);
        try {
            // TODO: Replace with actual tRPC mutation
            // await trpc.studentQuiz.startQuiz.mutate({ quizId, password });
            console.log("Starting quiz with password:", password);
            success("Quiz started successfully!");
            router.push(`/exam/quiz/${quizId}`);
        } catch (err) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "Failed to start quiz. Please check your password and try again.";
            showErrorToast(errorMessage);
        } finally {
            setIsStarting(false);
        }
    };

    // Update current time every second for precise timing
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Refetch quiz data when approaching access window (5 mins before start)
    useEffect(() => {
        if (!quizData) return;

        const startTime = new Date(quizData.startTime).getTime();
        const fiveMinutesBeforeStart = startTime - 5 * 60 * 1000;
        const timeUntilAccessWindow = fiveMinutesBeforeStart - currentTime;

        // If we're within 2 minutes of access window opening, check frequently
        if (timeUntilAccessWindow > 0 && timeUntilAccessWindow <= 2 * 60 * 1000) {
            const checkInterval = setInterval(() => {
                const now = Date.now();
                if (now >= fiveMinutesBeforeStart) {
                    refetch(); // Refetch to get access
                    clearInterval(checkInterval);
                }
            }, 5000); // Check every 5 seconds

            return () => clearInterval(checkInterval);
        }

        // If quiz is about to start, refetch frequently
        const timeUntilStart = startTime - currentTime;
        if (timeUntilStart > 0 && timeUntilStart <= 60000) {
            // Within 1 minute of start
            const checkInterval = setInterval(() => {
                const now = Date.now();
                if (now >= startTime) {
                    refetch(); // Refetch to get updated quiz status
                    clearInterval(checkInterval);
                }
            }, 5000); // Check every 5 seconds

            return () => clearInterval(checkInterval);
        }
    }, [quizData, currentTime, refetch]);

    // Format duration from PostgreSQL interval to readable format
    const formatDuration = (interval: string) => {
        // Expected format: "HH:MM:SS" or "X days HH:MM:SS"
        const parts = interval.split(" ");
        let totalMinutes = 0;

        if (parts.length === 3) {
            // Has days
            totalMinutes += parseInt(parts[0]) * 24 * 60;
            const timeParts = parts[2].split(":");
            totalMinutes += parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
        } else {
            // Just time
            const timeParts = parts[0].split(":");
            totalMinutes += parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
        }

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours > 0) {
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }
        return `${minutes}m`;
    };

    // Check if quiz is currently active AND user is in lab subnet (if labs assigned)
    const isQuizActive = useMemo(() => {
        if (!quizData) return false;
        const startTime = new Date(quizData.startTime).getTime();
        const endTime = new Date(quizData.endTime).getTime();
        const isTimeActive =
            currentTime >= startTime && currentTime <= endTime && quizData.status === "ACTIVE";

        // If labs are assigned, also check IP
        if (quizData.labs && quizData.labs.length > 0) {
            return isTimeActive && quizData.isInLabSubnet;
        }

        return isTimeActive;
    }, [quizData, currentTime]);

    // Check if quiz hasn't started yet - using real-time current time
    const isQuizUpcoming = useMemo(() => {
        if (!quizData) return false;
        const startTime = new Date(quizData.startTime).getTime();
        return currentTime < startTime && quizData.status === "UPCOMING";
    }, [quizData, currentTime]);

    // Check if user can start quiz (time requirement + IP requirement for labs)
    const canStartQuiz = useMemo(() => {
        if (!quizData) return false;
        const startTime = new Date(quizData.startTime).getTime();
        const isTimeReady = currentTime >= startTime;

        // If labs are assigned, also check IP
        if (quizData.labs && quizData.labs.length > 0) {
            return isTimeReady && quizData.isInLabSubnet;
        }

        return isTimeReady;
    }, [quizData, currentTime]);

    // Calculate time remaining until quiz starts
    const timeUntilStart = useMemo(() => {
        if (!quizData || !isQuizUpcoming) return null;
        const startTime = new Date(quizData.startTime).getTime();
        const diff = startTime - currentTime;
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        return { minutes, seconds };
    }, [quizData, isQuizUpcoming, currentTime]);

    const handleStartQuiz = () => {
        if (quizData?.isProtected) {
            setShowPasswordDialog(true);
        } else {
            void startQuiz();
        }
    };

    const handlePasswordSubmit = () => {
        if (!password.trim()) {
            showErrorToast("Please enter the quiz password");
            return;
        }

        void startQuiz(password);
        setShowPasswordDialog(false);
        setPassword("");
    };

    const handlePasswordCancel = () => {
        setShowPasswordDialog(false);
        setPassword("");
    };

    // Check for errors first before checking loading state
    if (error) {
        // Check if it's an access timing error (too early)
        const isTooEarly = error.message?.includes("will be available");

        if (isTooEarly) {
            return (
                <div className="min-h-[90vh] flex items-center justify-center bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
                    <Card className="max-w-lg w-full">
                        <CardContent className="text-center py-16 space-y-6">
                            <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">
                                    Quiz Instructions Not Available Yet
                                </h2>
                            </div>
                            <Alert className="text-left">
                                <Info className="h-4 w-4" />
                                <AlertTitle>When will it be available?</AlertTitle>
                                <AlertDescription>
                                    Quiz instructions will be accessible 5 minutes before the quiz
                                    starts. This page will automatically reload when access becomes
                                    available.
                                </AlertDescription>
                            </Alert>
                            <div className="pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => router.back()}
                                    className="w-full sm:w-auto"
                                >
                                    Go Back
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return (
            <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
                <Card className="max-w-lg w-full mx-4">
                    <CardContent className="text-center py-16">
                        <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-6" />
                        <h2 className="text-2xl font-bold mb-4">Quiz Not Found</h2>
                        <p className="text-muted-foreground text-lg">
                            {`The quiz you're looking for doesn't exist or has been removed.`}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show loading state if no data yet
    if (!quizData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md shadow-lg">
                    <CardContent className="p-8 text-center space-y-6">
                        <div className="relative">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-muted border-t-primary mx-auto"></div>
                            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-primary/30 mx-auto animate-ping"></div>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold text-foreground">
                                Loading Quiz Details
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Please wait while we load the quiz information...
                            </p>
                        </div>
                        <div className="flex justify-center space-x-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header Section */}
            <div className="bg-white dark:bg-slate-900 border-b border-border">
                <div className="px-4 py-4">
                    <div className="text-center space-y-3">
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-foreground">{quizData.name}</h1>
                            {quizData.description && (
                                <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                                    {quizData.description}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center justify-center gap-3">
                            <Badge
                                variant={
                                    isQuizActive
                                        ? "default"
                                        : isQuizUpcoming
                                          ? "secondary"
                                          : "outline"
                                }
                                className="text-xs px-3 py-1"
                            >
                                {isQuizActive
                                    ? "LIVE NOW"
                                    : isQuizUpcoming
                                      ? "UPCOMING"
                                      : quizData.status}
                            </Badge>
                            {quizData.isProtected && (
                                <Badge variant="destructive" className="text-xs px-3 py-1">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Secure Mode
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-4 py-4">
                {/* Key Information Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="border border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-muted rounded-lg">
                                    <Clock className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Duration</p>
                                    <p className="text-sm font-semibold">
                                        {formatDuration(quizData.duration)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-muted rounded-lg">
                                    <Calendar className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Start Time</p>
                                    <p className="text-sm font-semibold">
                                        {format(new Date(quizData.startTime), "MMM dd, hh:mm a")}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-muted rounded-lg">
                                    <Timer className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">End Time</p>
                                    <p className="text-sm font-semibold">
                                        {format(new Date(quizData.endTime), "MMM dd, hh:mm a")}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Important Alerts */}
                <div className="space-y-3 mb-6">
                    {/* Lab IP Restriction Alert */}
                    {quizData.labs && quizData.labs.length > 0 && !quizData.isInLabSubnet && (
                        <Alert variant="destructive">
                            <MapPin className="h-4 w-4" />
                            <AlertTitle className="text-sm font-bold">
                                Lab Access Required
                            </AlertTitle>
                            <AlertDescription className="text-xs">
                                This quiz must be taken from one of the assigned labs:{" "}
                                {quizData.labs
                                    .map((lab) => `${lab.name} (${lab.block})`)
                                    .join(", ")}
                                . Please connect from a lab computer to start the quiz.
                            </AlertDescription>
                        </Alert>
                    )}

                    {isQuizUpcoming && (
                        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <AlertTitle className="text-blue-800 dark:text-blue-200 text-sm font-bold">
                                Quiz Not Yet Started
                            </AlertTitle>
                            <AlertDescription className="text-blue-700 dark:text-blue-300 text-xs">
                                This quiz will begin on{" "}
                                {format(
                                    new Date(quizData.startTime),
                                    "EEEE, MMMM dd, yyyy 'at' hh:mm a"
                                )}
                                .
                            </AlertDescription>
                        </Alert>
                    )}

                    {quizData.status === "COMPLETED" && (
                        <Alert className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/20">
                            <CheckCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            <AlertTitle className="text-purple-800 dark:text-purple-200 text-sm font-bold">
                                Quiz Completed
                            </AlertTitle>
                            <AlertDescription className="text-purple-700 dark:text-purple-300 text-xs">
                                You have successfully completed this quiz. You are viewing these
                                instructions for reference.
                            </AlertDescription>
                        </Alert>
                    )}

                    {quizData.isProtected && (
                        <Alert variant="destructive">
                            <Shield className="h-4 w-4" />
                            <AlertTitle className="text-sm font-bold">
                                Secure Quiz Environment
                            </AlertTitle>
                            <AlertDescription className="text-xs">
                                This quiz runs in secure mode. Avoid switching tabs or applications.
                            </AlertDescription>
                        </Alert>
                    )}

                    {quizData.autoSubmit && (
                        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <AlertTitle className="text-amber-800 dark:text-amber-200 text-sm font-bold">
                                Auto-Submit Enabled
                            </AlertTitle>
                            <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs">
                                Quiz will be automatically submitted when time expires.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                {/* Faculty Instructions - Show prominently if available */}
                {quizData.instructions && quizData.instructions.trim() && (
                    <Card className="mb-6 border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200 text-lg">
                                <FileText className="h-4 w-4" />
                                Instructions from Faculty
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="prose prose-blue dark:prose-invert max-w-none">
                                <p className="text-blue-700 dark:text-blue-300 text-sm leading-relaxed whitespace-pre-wrap">
                                    {quizData.instructions}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                    {/* Left Column - Quiz Settings */}
                    <div className="xl:col-span-3 space-y-6">
                        {/* Quiz Features */}
                        <Card className="shadow-sm border-0 bg-white/80 dark:bg-slate-900/80">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                    <Info className="h-5 w-5 text-primary" />
                                    Quiz Settings & Features
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                        <div
                                            className={`p-2 rounded-lg ${quizData.fullScreen ? "bg-green-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"}`}
                                        >
                                            <Monitor className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">Full Screen Mode</p>
                                            <p className="text-xs text-muted-foreground">
                                                {quizData.fullScreen ? "Required" : "Not required"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                        <div
                                            className={`p-2 rounded-lg ${quizData.shuffleQuestions ? "bg-blue-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"}`}
                                        >
                                            <Shuffle className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">Question Order</p>
                                            <p className="text-xs text-muted-foreground">
                                                {quizData.shuffleQuestions
                                                    ? "Randomized"
                                                    : "Fixed order"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                        <div
                                            className={`p-2 rounded-lg ${quizData.shuffleOptions ? "bg-purple-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"}`}
                                        >
                                            <Shuffle className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">Answer Options</p>
                                            <p className="text-xs text-muted-foreground">
                                                {quizData.shuffleOptions
                                                    ? "Randomized"
                                                    : "Fixed order"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                        <div
                                            className={`p-2 rounded-lg ${quizData.calculator ? "bg-green-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"}`}
                                        >
                                            <Calculator className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">Calculator</p>
                                            <p className="text-xs text-muted-foreground">
                                                {quizData.calculator
                                                    ? "Available"
                                                    : "Not available"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                        <div
                                            className={`p-2 rounded-lg ${quizData.linearQuiz ? "bg-orange-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"}`}
                                        >
                                            <Lock className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">Navigation</p>
                                            <p className="text-xs text-muted-foreground">
                                                {quizData.linearQuiz
                                                    ? "Linear - cannot go back"
                                                    : "Free navigation"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                        <div
                                            className={`p-2 rounded-lg ${quizData.publishResult ? "bg-green-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"}`}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">Results</p>
                                            <p className="text-xs text-muted-foreground">
                                                {quizData.publishResult
                                                    ? "Shown immediately"
                                                    : "Available later"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* General Guidelines */}
                        <Card className="shadow-sm border-0 bg-white/80 dark:bg-slate-900/80">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    General Guidelines
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg mt-0.5">
                                                <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">
                                                    Read Carefully
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Read all questions thoroughly.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg mt-0.5">
                                                <CheckCircle className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">Navigation</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Use navigation buttons to move between
                                                    questions.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg mt-0.5">
                                                <CheckCircle className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">
                                                    Time Management
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Submit before time expires.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg mt-0.5">
                                                <CheckCircle className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">Connection</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Ensure stable internet connection.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Additional Info */}
                    <div className="space-y-8">
                        {/* Instructor Information */}
                        {quizData.instructor && (
                            <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        Instructor
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                                            {quizData.instructor.name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")
                                                .toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">
                                                {quizData.instructor.name}
                                            </p>
                                            <p className="text-sm text-muted-foreground truncate">
                                                {quizData.instructor.email}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Course Information */}
                        {quizData.courses && quizData.courses.length > 0 && (
                            <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Course Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {quizData.courses.map((course) => (
                                        <div key={course.id} className="p-3 rounded-lg bg-muted/30">
                                            <p className="font-medium">{course.name}</p>
                                            <p className="text-sm text-muted-foreground font-mono">
                                                {course.code}
                                            </p>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* Lab Requirements */}
                        {quizData.labs && quizData.labs.length > 0 && (
                            <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        Authorized Labs
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {quizData.labs.map((lab) => (
                                        <div key={lab.id} className="p-3 rounded-lg bg-muted/30">
                                            <p className="font-medium">{lab.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {lab.block}
                                            </p>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-12 mb-8">
                {/* Countdown Timer for Upcoming Quiz */}
                {isQuizUpcoming && timeUntilStart && (
                    <div className="text-center mb-8">
                        <Card className="inline-block shadow-2xl border-0 bg-linear-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30 backdrop-blur-sm">
                            <CardContent className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                                        <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">
                                            Quiz starts in
                                        </p>
                                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            {timeUntilStart.minutes}m {timeUntilStart.seconds}s
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Start Button */}
                <div className="flex justify-center">
                    {canStartQuiz ? (
                        <div className="relative group">
                            {/* Glow effect */}
                            <div className="absolute -inset-1 bg-linear-to-r from-green-600 to-emerald-600 rounded-lg blur opacity-50 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                            <Button
                                onClick={handleStartQuiz}
                                disabled={isStarting}
                                size="lg"
                                className="relative bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-12 py-6 text-lg font-semibold shadow-xl transform transition-all duration-200 hover:scale-105 active:scale-95"
                            >
                                {isStarting ? (
                                    <>Loading...</>
                                ) : (
                                    <>
                                        <Play className="mr-3 h-6 w-6" />
                                        Start Quiz Now
                                    </>
                                )}
                            </Button>
                        </div>
                    ) : isQuizUpcoming ? (
                        <div className="relative">
                            <Button
                                size="lg"
                                variant="outline"
                                disabled
                                className="px-12 py-4 text-xl font-semibold bg-gray-50 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-2xl shadow-lg text-gray-500 dark:text-gray-400"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-200 dark:bg-gray-800 rounded-full">
                                        <Clock className="h-6 w-6" />
                                    </div>
                                    <span>Quiz Not Yet Available</span>
                                </div>
                            </Button>
                        </div>
                    ) : quizData.status === "COMPLETED" ? (
                        <div className="flex gap-4">
                            <div className="relative">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={() => router.push(`/results/${quizId}`)}
                                    className="px-8 py-4 text-lg font-semibold bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-2xl shadow-lg text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-200 dark:bg-purple-800 rounded-full">
                                            <Eye className="h-5 w-5" />
                                        </div>
                                        <span>View Results</span>
                                    </div>
                                </Button>
                            </div>
                            <div className="relative">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={() => router.push("/quiz")}
                                    className="px-8 py-4 text-lg font-semibold bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl shadow-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <span>Back to Quizzes</span>
                                    </div>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="relative">
                            <Button
                                size="lg"
                                variant="outline"
                                disabled
                                className="px-12 py-4 text-xl font-semibold bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-2xl shadow-lg text-red-500 dark:text-red-400"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-200 dark:bg-red-800 rounded-full">
                                        <AlertTriangle className="h-6 w-6" />
                                    </div>
                                    <span>Quiz No Longer Available</span>
                                </div>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Additional Status Information */}
                {canStartQuiz && (
                    <div className="text-center mt-6">
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                            ✨ Quiz is live and ready to start!
                        </p>
                    </div>
                )}

                {isQuizUpcoming && (
                    <div className="text-center mt-6">
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                            🕒 Please wait for the quiz to begin
                        </p>
                    </div>
                )}

                {!canStartQuiz &&
                    !isQuizUpcoming &&
                    quizData.status !== "COMPLETED" &&
                    quizData.labs &&
                    quizData.labs.length > 0 &&
                    !quizData.isInLabSubnet && (
                        <div className="text-center mt-6">
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                🚫 You must be in an assigned lab to start this quiz
                            </p>
                        </div>
                    )}

                {quizData.status === "COMPLETED" && (
                    <div className="text-center mt-6">
                        <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                            ✅ Quiz completed successfully! You can review these instructions
                            anytime.
                        </p>
                    </div>
                )}
            </div>

            {/* Footer Note */}
            <div className="mt-8 text-center text-sm text-muted-foreground">
                <p>
                    Please review all instructions carefully before starting the quiz. If you have
                    any questions, contact your instructor.
                </p>
            </div>

            {/* Password Dialog */}
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-blue-600" />
                            Protected Quiz
                        </DialogTitle>
                        <DialogDescription>
                            This quiz is password protected. Please enter the password provided by
                            your instructor to start the quiz.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="quiz-password">Quiz Password</Label>
                            <Input
                                id="quiz-password"
                                type="password"
                                placeholder="Enter quiz password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handlePasswordSubmit();
                                    }
                                }}
                                className="w-full"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handlePasswordCancel}
                            disabled={isStarting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePasswordSubmit}
                            disabled={isStarting}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isStarting ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Starting...
                                </div>
                            ) : (
                                "Start Quiz"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default QuizInstructionsPage;
