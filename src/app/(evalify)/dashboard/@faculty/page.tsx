"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    BookOpen,
    ClipboardList,
    FileQuestion,
    Plus,
    Library,
    GraduationCap,
    ArrowRight,
    Clock,
    CheckCircle2,
    Calendar as CalendarIcon,
    Sparkles,
} from "lucide-react";
import { useAnalytics } from "@/hooks/use-analytics";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { capitalizeName } from "@/lib/utils";

interface DashboardStats {
    totalCourses: number;
    activeCourses: number;
    totalQuizzes: number;
    upcomingQuizzes: number;
    activeQuizzes: number;
    completedQuizzes: number;
    totalQuestionBanks: number;
    totalStudents: number;
}

interface CourseWithStats {
    id: string;
    name: string;
    code: string;
    semesterName: string | null;
    semesterYear: number | null;
    isActive: "ACTIVE" | "INACTIVE";
    quizCount: number;
    studentCount: number;
}

export default function FacultyDashboard() {
    const router = useRouter();
    const { track } = useAnalytics();
    const session = useSession();

    // Fetch faculty courses
    const { data: coursesData, isLoading: isLoadingCourses } = trpc.facultyCourse.list.useQuery({
        limit: 100,
        offset: 0,
        isActive: "ALL",
    });

    // Fetch question banks
    const { data: banksData, isLoading: isLoadingBanks } = trpc.bank.list.useQuery({
        limit: 100,
        offset: 0,
    });

    // Fetch students from instructor's courses
    const { data: studentsData, isLoading: isLoadingStudents } =
        trpc.facultyCourse.getStudentsByInstructor.useQuery();

    // Fetch quizzes for all courses
    const courses = coursesData?.courses || [];
    const courseIds = courses.map((c) => c.id);

    // Fetch quizzes for each course
    const quizQueries = trpc.useQueries((t) =>
        courseIds.map((courseId) =>
            t.facultyQuiz.listByCourse({
                courseId,
                limit: 100,
                offset: 0,
                status: "ALL",
            })
        )
    );

    const isLoadingQuizzes = quizQueries.some((q) => q.isLoading);
    const allQuizzes = quizQueries.flatMap((q) => q.data?.quizzes || []);

    // Compute dashboard stats
    const stats = useMemo((): DashboardStats | null => {
        if (!coursesData || !banksData) {
            return null;
        }

        const courses = coursesData.courses || [];
        const now = new Date();

        const upcomingQuizzes = allQuizzes.filter((q) => new Date(q.startTime) > now);
        const activeQuizzes = allQuizzes.filter(
            (q) => new Date(q.startTime) <= now && new Date(q.endTime) >= now
        );
        const completedQuizzes = allQuizzes.filter((q) => new Date(q.endTime) < now);

        // Count unique students across all courses
        const uniqueStudents = new Set();
        (studentsData || []).forEach((course) => {
            course.students.forEach((student: { id: string }) => {
                uniqueStudents.add(student.id);
            });
        });

        return {
            totalCourses: coursesData.total || courses.length,
            activeCourses: courses.filter((c) => c.isActive === "ACTIVE").length,
            totalQuizzes: allQuizzes.length,
            upcomingQuizzes: upcomingQuizzes.length,
            activeQuizzes: activeQuizzes.length,
            completedQuizzes: completedQuizzes.length,
            totalQuestionBanks: banksData.total || (banksData.rows || []).length,
            totalStudents: uniqueStudents.size,
        };
    }, [coursesData, banksData, allQuizzes, studentsData]);

    // Compute course stats with quiz and student counts
    const courseStats = useMemo((): CourseWithStats[] => {
        if (!coursesData || !studentsData) {
            return [];
        }

        const courses = coursesData.courses || [];

        return courses.map((course) => {
            // Get quiz count for this course
            const courseQuizzes =
                quizQueries.find((q) => q.data?.quizzes?.[0]?.id)?.data?.quizzes || [];
            const quizCount = courseQuizzes.filter((q) =>
                allQuizzes.some((aq) => aq.id === q.id)
            ).length;

            // Get student count for this course
            const courseStudentData = studentsData.find((s) => s.courseId === course.id);
            const studentCount = courseStudentData?.students?.length || 0;

            return {
                id: course.id,
                name: course.name,
                code: course.code,
                semesterName: course.semesterName,
                semesterYear: course.semesterYear,
                isActive: course.isActive,
                quizCount,
                studentCount,
            };
        });
    }, [coursesData, studentsData, quizQueries, allQuizzes]);

    const isLoading = isLoadingCourses || isLoadingBanks || isLoadingStudents || isLoadingQuizzes;

    const handleNavigation = (path: string, label: string) => {
        track("faculty_dashboard_navigation", { path, label });
        router.push(path);
    };

    if (isLoading || !stats) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <Skeleton className="h-20" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6 min-h-screen">
            {/* Welcome Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <h1 className="text-2xl md:text-3xl font-bold">
                        Welcome Back, {capitalizeName(session?.data?.user.name || "")}!
                    </h1>
                </div>
                <p className="text-muted-foreground">
                    {"Here's what's happening with your courses today"}
                </p>
            </div>

            {/* Main Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card
                    className="relative overflow-hidden cursor-pointer transition-all hover:shadow-lg group"
                    onClick={() => handleNavigation("/course", "Courses Overview")}
                >
                    <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 to-blue-600/5" />
                    <CardContent className="p-6 relative">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">
                                    My Courses
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-3xl font-bold">{stats.totalCourses}</h2>
                                    <span className="text-sm text-muted-foreground">total</span>
                                </div>
                            </div>
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:scale-110 transition-transform">
                                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="relative overflow-hidden cursor-pointer transition-all hover:shadow-lg group"
                    onClick={() => handleNavigation("/question-bank", "Question Banks")}
                >
                    <div className="absolute inset-0 bg-linear-to-br from-purple-500/10 to-purple-600/5" />
                    <CardContent className="p-6 relative">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Question Banks
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-3xl font-bold">
                                        {stats.totalQuestionBanks}
                                    </h2>
                                    <span className="text-sm text-muted-foreground">banks</span>
                                </div>
                            </div>
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:scale-110 transition-transform">
                                <Library className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="relative overflow-hidden cursor-pointer transition-all hover:shadow-lg group"
                    onClick={() => handleNavigation("/course", "Quizzes")}
                >
                    <div className="absolute inset-0 bg-linear-to-br from-green-500/10 to-green-600/5" />
                    <CardContent className="p-6 relative">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Total Quizzes
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-3xl font-bold">{stats.totalQuizzes}</h2>
                                    <span className="text-sm text-muted-foreground">created</span>
                                </div>
                            </div>
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:scale-110 transition-transform">
                                <ClipboardList className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="relative overflow-hidden cursor-pointer transition-all hover:shadow-lg group"
                    onClick={() => handleNavigation("/course", "Students")}
                >
                    <div className="absolute inset-0 bg-linear-to-br from-orange-500/10 to-orange-600/5" />
                    <CardContent className="p-6 relative">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Students
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-3xl font-bold">{stats.totalStudents}</h2>
                                    <span className="text-sm text-muted-foreground">enrolled</span>
                                </div>
                            </div>
                            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg group-hover:scale-110 transition-transform">
                                <GraduationCap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quiz Status & Courses Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Quiz Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CalendarIcon className="h-5 w-5" />
                            Quiz Timeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                                    <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <div>
                                    <p className="font-semibold">Upcoming</p>
                                    <p className="text-sm text-muted-foreground">
                                        Scheduled quizzes
                                    </p>
                                </div>
                            </div>
                            <div className="text-2xl font-bold">{stats.upcomingQuizzes}</div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="font-semibold">Active Now</p>
                                    <p className="text-sm text-muted-foreground">
                                        Currently running
                                    </p>
                                </div>
                            </div>
                            <div className="text-2xl font-bold">{stats.activeQuizzes}</div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 dark:bg-gray-900/30 rounded-lg">
                                    <FileQuestion className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                </div>
                                <div>
                                    <p className="font-semibold">Completed</p>
                                    <p className="text-sm text-muted-foreground">Past quizzes</p>
                                </div>
                            </div>
                            <div className="text-2xl font-bold">{stats.completedQuizzes}</div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Sparkles className="h-5 w-5" />
                            Quick Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button
                            variant="outline"
                            className="w-full justify-between h-auto p-4 hover:bg-primary/5 hover:border-primary"
                            onClick={() =>
                                handleNavigation("/question-bank", "Create Question Bank")
                            }
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                    <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold">Create Question Bank</p>
                                    <p className="text-sm text-muted-foreground">
                                        Build a new question repository
                                    </p>
                                </div>
                            </div>
                            <ArrowRight className="h-5 w-5" />
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full justify-between h-auto p-4 hover:bg-primary/5 hover:border-primary"
                            onClick={() => handleNavigation("/course", "Create Quiz")}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                    <ClipboardList className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold">Create New Quiz</p>
                                    <p className="text-sm text-muted-foreground">
                                        Start a new assessment
                                    </p>
                                </div>
                            </div>
                            <ArrowRight className="h-5 w-5" />
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full justify-between h-auto p-4 hover:bg-primary/5 hover:border-primary"
                            onClick={() => handleNavigation("/course", "View Courses")}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold">View All Courses</p>
                                    <p className="text-sm text-muted-foreground">
                                        Manage your courses
                                    </p>
                                </div>
                            </div>
                            <ArrowRight className="h-5 w-5" />
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Active Courses */}
            {courseStats && courseStats.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <BookOpen className="h-5 w-5" />
                            Active Courses
                        </CardTitle>
                        {courseStats.length > 6 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleNavigation("/course", "View All Courses")}
                            >
                                View All
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {courseStats.slice(0, 6).map((course) => (
                                <Card
                                    key={course.id}
                                    className={cn(
                                        "cursor-pointer transition-all hover:shadow-md group",
                                        course.isActive === "ACTIVE"
                                            ? "border-l-4 border-l-primary"
                                            : "opacity-70"
                                    )}
                                    onClick={() =>
                                        handleNavigation(
                                            `/course/${course.id}/quiz`,
                                            `View ${course.name}`
                                        )
                                    }
                                >
                                    <CardContent className="p-4">
                                        <div className="space-y-3">
                                            <div>
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                                                        {course.name}
                                                    </h3>
                                                    <Badge
                                                        variant={
                                                            course.isActive === "ACTIVE"
                                                                ? "default"
                                                                : "secondary"
                                                        }
                                                        className="text-xs shrink-0"
                                                    >
                                                        {course.code}
                                                    </Badge>
                                                </div>
                                                {(course.semesterName || course.semesterYear) && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {course.semesterName} {course.semesterYear}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                                                        <ClipboardList className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <span className="font-medium">
                                                        {course.quizCount}
                                                    </span>
                                                    <span className="text-muted-foreground text-xs">
                                                        quizzes
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
