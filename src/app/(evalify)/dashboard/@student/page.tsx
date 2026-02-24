"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useAnalytics } from "@/hooks/use-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    BookOpen,
    Calendar,
    GraduationCap,
    Clock,
    PlayCircle,
    CalendarClock,
    BookMarked,
    TrendingUp,
    Users,
    FileText,
    ArrowRight,
} from "lucide-react";

interface DashboardStats {
    totalCourses: number;
    activeCourses: number;
    totalQuizzes: number;
    liveQuizzes: number;
    upcomingQuizzes: number;
    completedQuizzes: number;
    missedQuizzes: number;
}

/**
 * Renders the student dashboard UI showing course and quiz overviews, lists, and navigation actions.
 *
 * Displays overview statistic cards, live and upcoming quizzes with actions, quiz performance metrics,
 * and student information (courses, active semesters, batch). Fetches course and quiz data, computes
 * derived stats and lists, and tracks user interactions before navigating.
 *
 * @returns The React element for the Student Dashboard page.
 */
// Helper function to render course information with proper null handling
function renderCourseInfo(
    courses:
        | Array<{
              id: string;
              name: string | null;
              code: string | null;
          }>
        | null
        | undefined,
    fallbackName: string | null | undefined,
    fallbackCode: string | null | undefined
): React.ReactNode {
    // If we have an array of courses, render them with separators
    if (courses && courses.length > 0) {
        return courses.map((c, idx) => (
            <span key={c.id || idx}>
                {c.name || "Unknown"} • {c.code || "N/A"}
                {idx < courses.length - 1 && " | "}
            </span>
        ));
    }

    // Otherwise, use the fallback values
    return `${fallbackName || "Unknown"} • ${fallbackCode || "N/A"}`;
}

export default function StudentDashboard() {
    const router = useRouter();
    const { track } = useAnalytics();

    // Fetch student data using tRPC
    const { data: coursesData, isLoading: isLoadingCourses } = trpc.studentCourse.list.useQuery({
        isActive: "ACTIVE",
        limit: 100,
        offset: 0,
    });

    const { data: allQuizzesData, isLoading: isLoadingQuizzes } = trpc.studentQuiz.listAll.useQuery(
        {
            status: "all",
        }
    );

    // Compute dashboard stats
    const stats = useMemo((): DashboardStats | null => {
        if (!coursesData || !allQuizzesData) {
            return null;
        }

        const courses = coursesData.courses || [];
        const quizzes = allQuizzesData.quizzes || [];

        return {
            totalCourses: coursesData.total || courses.length,
            activeCourses: courses.filter((c) => c.isActive === "ACTIVE").length,
            totalQuizzes: quizzes.length,
            liveQuizzes: quizzes.filter((q) => q.status === "active").length,
            upcomingQuizzes: quizzes.filter((q) => q.status === "upcoming").length,
            completedQuizzes: quizzes.filter((q) => q.status === "completed").length,
            missedQuizzes: quizzes.filter((q) => q.status === "missed").length,
        };
    }, [coursesData, allQuizzesData]);

    // Get student's batch info from courses (assuming student has courses)
    const studentBatch = useMemo(() => {
        if (!coursesData?.courses || coursesData.courses.length === 0) return null;
        // The batch info would typically come from user profile
        // For now, we'll create a placeholder
        return {
            name: "Batch 2024-A",
            department: "Computer Science",
            joinYear: 2024,
            graduationYear: 2028,
        };
    }, [coursesData]);

    // Get active semesters from courses
    const activeSemesters = useMemo(() => {
        if (!coursesData?.courses) return [];
        const semesters = new Map<
            string,
            { id: string; name: string; year: number; courseCount: number }
        >();

        coursesData.courses.forEach((course) => {
            if (course.semesterId && course.semesterName) {
                const key = course.semesterId;
                if (semesters.has(key)) {
                    const sem = semesters.get(key)!;
                    sem.courseCount++;
                } else {
                    semesters.set(key, {
                        id: course.semesterId,
                        name: course.semesterName,
                        year: course.semesterYear || new Date().getFullYear(),
                        courseCount: 1,
                    });
                }
            }
        });

        return Array.from(semesters.values());
    }, [coursesData]);

    // Separate live and upcoming quizzes
    const liveQuizzes = useMemo(() => {
        if (!allQuizzesData?.quizzes) return [];
        return allQuizzesData.quizzes.filter((q) => q.status === "active");
    }, [allQuizzesData]);

    const upcomingQuizzes = useMemo(() => {
        if (!allQuizzesData?.quizzes) return [];
        return allQuizzesData.quizzes.filter((q) => q.status === "upcoming");
    }, [allQuizzesData]);

    // Determine default tab based on availability
    const defaultTab = useMemo(() => {
        return liveQuizzes.length > 0 ? "live" : "upcoming";
    }, [liveQuizzes]);

    const isLoading = isLoadingCourses || isLoadingQuizzes;

    const handleNavigation = (path: string, label: string) => {
        track("dashboard_navigation", { path, label });
        router.push(path);
    };

    const handleQuizClick = (quizId: string, quizName: string, courseId: string) => {
        track("quiz_clicked_from_dashboard", { quizId, quizName, courseId });
        router.push(`/course/${courseId}/quiz/${quizId}/instruction`);
    };

    if (isLoading || !stats) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-black dark:text-white">
                            Student Dashboard
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Loading your dashboard...
                        </p>
                    </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-16"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-black dark:text-white">
                        Student Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Welcome back! Here&apos;s your academic overview
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => handleNavigation("/course", "View All Courses")}
                    >
                        <BookOpen className="h-4 w-4 mr-2" />
                        My Courses
                    </Button>
                    <Button
                        onClick={() => handleNavigation("/student/quiz", "View All Quizzes")}
                        className="bg-black hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        All Quizzes
                    </Button>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card
                    className="border border-blue-200 dark:border-blue-800 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => handleNavigation("/course", "Courses Overview")}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            Active Courses
                        </CardTitle>
                        <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {stats.activeCourses}
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {stats.totalCourses} total courses
                        </p>
                    </CardContent>
                </Card>

                <Card
                    className="border border-green-200 dark:border-green-800 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => handleNavigation("/quiz", "Live Quizzes")}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                            Live Quizzes
                        </CardTitle>
                        <PlayCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                            {stats.liveQuizzes}
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            Active now
                        </p>
                    </CardContent>
                </Card>

                <Card
                    className="border border-purple-200 dark:border-purple-800 bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => handleNavigation("/quiz", "Upcoming Quizzes")}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                            Upcoming Quizzes
                        </CardTitle>
                        <CalendarClock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                            {stats.upcomingQuizzes}
                        </div>
                        <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center mt-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            Scheduled
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-orange-200 dark:border-orange-800 bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
                            Total Quizzes
                        </CardTitle>
                        <BookMarked className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                            {stats.totalQuizzes}
                        </div>
                        <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center mt-1">
                            <FileText className="h-3 w-3 mr-1" />
                            {stats.completedQuizzes} completed
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Column - Quizzes (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Live & Upcoming Quizzes */}
                    <Card className=" border border-gray-200 dark:border-gray-800">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    My Quizzes
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        handleNavigation("/student/quiz", "View All Quizzes")
                                    }
                                >
                                    View All
                                    <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue={defaultTab} className="w-full">
                                <TabsList className="w-full grid grid-cols-2 mb-6">
                                    <TabsTrigger
                                        value="live"
                                        className="flex items-center gap-2 data-[state=active]:bg-green-100 dark:data-[state=active]:bg-green-900/30 data-[state=active]:text-green-700 dark:data-[state=active]:text-green-400"
                                        disabled={stats.liveQuizzes === 0}
                                    >
                                        <PlayCircle className="h-4 w-4" />
                                        <span className="hidden sm:inline">Live</span>
                                        <span className="inline sm:hidden">Live</span>
                                        <span className="ml-1 font-semibold">
                                            ({stats.liveQuizzes})
                                        </span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="upcoming"
                                        className="flex items-center gap-2 data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-400"
                                        disabled={stats.upcomingQuizzes === 0}
                                    >
                                        <CalendarClock className="h-4 w-4" />
                                        <span className="hidden sm:inline">Upcoming</span>
                                        <span className="inline sm:hidden">Soon</span>
                                        <span className="ml-1 font-semibold">
                                            ({stats.upcomingQuizzes})
                                        </span>
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="live" className="mt-0">
                                    {liveQuizzes.length === 0 ? (
                                        <div className="text-center py-16">
                                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                                                <PlayCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                                No Live Quizzes
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                                                There are no active quizzes at the moment. Check
                                                back when your quizzes start!
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {liveQuizzes.map((quiz) => (
                                                <Card
                                                    key={quiz.id}
                                                    className="border-l-4 border-l-green-500 hover:shadow-md transition-all cursor-pointer group bg-linear-to-r from-green-50/50 to-transparent dark:from-green-900/10"
                                                    onClick={() =>
                                                        handleQuizClick(
                                                            quiz.id,
                                                            quiz.name,
                                                            quiz.courseId!
                                                        )
                                                    }
                                                >
                                                    <CardContent className="p-4">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start gap-3 mb-2">
                                                                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 group-hover:scale-110 transition-transform">
                                                                        <PlayCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 truncate">
                                                                            {quiz.name}
                                                                        </h4>
                                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                            {renderCourseInfo(
                                                                                quiz.courses,
                                                                                quiz.courseName,
                                                                                quiz.courseCode
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {quiz.description && (
                                                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2 ml-14">
                                                                        {quiz.description}
                                                                    </p>
                                                                )}
                                                                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400 ml-14">
                                                                    <span className="flex items-center gap-1.5">
                                                                        <Clock className="h-3.5 w-3.5" />
                                                                        {quiz.duration} minutes
                                                                    </span>
                                                                    <span className="flex items-center gap-1.5">
                                                                        <Calendar className="h-3.5 w-3.5" />
                                                                        {new Date(
                                                                            quiz.startTime
                                                                        ).toLocaleString()}
                                                                    </span>
                                                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                                                        LIVE NOW
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 shrink-0"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleQuizClick(
                                                                        quiz.id,
                                                                        quiz.name,
                                                                        quiz.courseId!
                                                                    );
                                                                }}
                                                            >
                                                                Start Quiz
                                                                <ArrowRight className="h-4 w-4 ml-1" />
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="upcoming" className="mt-0">
                                    {upcomingQuizzes.length === 0 ? (
                                        <div className="text-center py-16">
                                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-4">
                                                <CalendarClock className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                                No Upcoming Quizzes
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                                                You have no scheduled quizzes at the moment. New
                                                quizzes will appear here.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {upcomingQuizzes.map((quiz) => (
                                                <Card
                                                    key={quiz.id}
                                                    className="border-l-4 border-l-purple-500 hover:shadow-md transition-all cursor-pointer group bg-linear-to-r from-purple-50/50 to-transparent dark:from-purple-900/10"
                                                    onClick={() =>
                                                        handleQuizClick(
                                                            quiz.id,
                                                            quiz.name,
                                                            quiz.courseId!
                                                        )
                                                    }
                                                >
                                                    <CardContent className="p-4">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start gap-3 mb-2">
                                                                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 group-hover:scale-110 transition-transform">
                                                                        <CalendarClock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 truncate">
                                                                            {quiz.name}
                                                                        </h4>
                                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                            {renderCourseInfo(
                                                                                quiz.courses,
                                                                                quiz.courseName,
                                                                                quiz.courseCode
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {quiz.description && (
                                                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2 ml-14">
                                                                        {quiz.description}
                                                                    </p>
                                                                )}
                                                                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400 ml-14">
                                                                    <span className="flex items-center gap-1.5">
                                                                        <Clock className="h-3.5 w-3.5" />
                                                                        {quiz.duration} minutes
                                                                    </span>
                                                                    <span className="flex items-center gap-1.5">
                                                                        <Calendar className="h-3.5 w-3.5" />
                                                                        {new Date(
                                                                            quiz.startTime
                                                                        ).toLocaleString()}
                                                                    </span>
                                                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium">
                                                                        <CalendarClock className="h-3 w-3" />
                                                                        SCHEDULED
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="shrink-0 border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleQuizClick(
                                                                        quiz.id,
                                                                        quiz.name,
                                                                        quiz.courseId!
                                                                    );
                                                                }}
                                                            >
                                                                View Details
                                                                <ArrowRight className="h-4 w-4 ml-1" />
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    {/* Quiz Performance Summary */}
                    <Card className=" border border-gray-200 dark:border-gray-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Quiz Performance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium text-green-700 dark:text-green-300">
                                            Completed
                                        </p>
                                        <PlayCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                        {stats.completedQuizzes}
                                    </p>
                                </div>
                                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                            Live
                                        </p>
                                        <PlayCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                        {stats.liveQuizzes}
                                    </p>
                                </div>
                                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                            Upcoming
                                        </p>
                                        <CalendarClock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                                        {stats.upcomingQuizzes}
                                    </p>
                                </div>
                                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium text-red-700 dark:text-red-300">
                                            Missed
                                        </p>
                                        <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />
                                    </div>
                                    <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                                        {stats.missedQuizzes}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Student Info (1/3 width) */}
                <div className="space-y-6">
                    {/* Active Courses */}
                    <Card className=" border border-gray-200 dark:border-gray-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5" />
                                My Courses
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {coursesData?.courses && coursesData.courses.length > 0 ? (
                                <>
                                    {coursesData.courses.slice(0, 5).map((course) => (
                                        <div
                                            key={course.id}
                                            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                            onClick={() =>
                                                handleNavigation(
                                                    `/course/${course.id}/quiz`,
                                                    `Course: ${course.name}`
                                                )
                                            }
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">
                                                    {course.name}
                                                </p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                                    {course.code}
                                                </p>
                                            </div>
                                            <div className="ml-2">
                                                {course.isActive === "ACTIVE" ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400">
                                                        Inactive
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {coursesData.courses.length > 5 && (
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() =>
                                                handleNavigation("/course", "View All Courses")
                                            }
                                        >
                                            View All ({coursesData.total})
                                            <ArrowRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <BookOpen className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-600 mb-2" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        No courses enrolled
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Active Semesters */}
                    <Card className=" border border-gray-200 dark:border-gray-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Active Semesters
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {activeSemesters.length > 0 ? (
                                activeSemesters.map((semester) => (
                                    <div
                                        key={semester.id}
                                        className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-medium text-sm">{semester.name}</p>
                                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                                {semester.year}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                            <BookOpen className="h-3 w-3" />
                                            <span>{semester.courseCount} courses</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <Calendar className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-600 mb-2" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        No active semesters
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Student Batch */}
                    <Card className=" border border-gray-200 dark:border-gray-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <GraduationCap className="h-5 w-5" />
                                My Batch
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {studentBatch ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-lg bg-linear-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border border-indigo-200 dark:border-indigo-800">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 rounded-lg bg-indigo-600 dark:bg-indigo-500">
                                                <GraduationCap className="h-5 w-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-indigo-900 dark:text-indigo-100">
                                                    {studentBatch.name}
                                                </p>
                                                <p className="text-sm text-indigo-700 dark:text-indigo-300">
                                                    {studentBatch.department}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-2 rounded bg-white/50 dark:bg-black/20">
                                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                                    Join Year
                                                </p>
                                                <p className="font-semibold text-indigo-900 dark:text-indigo-100">
                                                    {studentBatch.joinYear}
                                                </p>
                                            </div>
                                            <div className="p-2 rounded bg-white/50 dark:bg-black/20">
                                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                                    Graduation
                                                </p>
                                                <p className="font-semibold text-indigo-900 dark:text-indigo-100">
                                                    {studentBatch.graduationYear}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Users className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-600 mb-2" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        No batch assigned
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
