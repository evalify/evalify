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
    PlayCircle,
} from "lucide-react";
import { useAnalytics } from "@/hooks/use-analytics";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { capitalizeName } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    const allQuizzes = useMemo(() => {
        const quizzes = quizQueries.flatMap((q) => q.data?.quizzes || []);
        return Array.from(new Map(quizzes.map((q) => [q.id, q])).values());
    }, [quizQueries]);

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

        return courses.map((course, index) => {
            // Get quiz count for this course by matching the index
            // quizQueries is in the same order as courseIds/courses
            const courseQuizzes = quizQueries[index]?.data?.quizzes || [];
            const quizCount = courseQuizzes.length;

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
    }, [coursesData, studentsData, quizQueries]);

    const isLoading = isLoadingCourses || isLoadingBanks || isLoadingStudents || isLoadingQuizzes;

    // Categorize quizzes with course information
    const activeQuizzes = useMemo(() => {
        const now = new Date();
        return allQuizzes
            .filter((q) => new Date(q.startTime) <= now && new Date(q.endTime) >= now)
            .map((quiz) => {
                const course = courses.find((c) => {
                    const quizIndex = courses.indexOf(c);
                    return (quizQueries[quizIndex]?.data?.quizzes || []).some(
                        (cq) => cq.id === quiz.id
                    );
                });
                return { ...quiz, course };
            })
            .slice(0, 3);
    }, [allQuizzes, courses, quizQueries]);

    const upcomingQuizzes = useMemo(() => {
        const now = new Date();
        return allQuizzes
            .filter((q) => new Date(q.startTime) > now)
            .map((quiz) => {
                const course = courses.find((c) => {
                    const quizIndex = courses.indexOf(c);
                    return (quizQueries[quizIndex]?.data?.quizzes || []).some(
                        (cq) => cq.id === quiz.id
                    );
                });
                return { ...quiz, course };
            })
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .slice(0, 3);
    }, [allQuizzes, courses, quizQueries]);

    const completedQuizzes = useMemo(() => {
        const now = new Date();
        return allQuizzes
            .filter((q) => new Date(q.endTime) < now)
            .map((quiz) => {
                const course = courses.find((c) => {
                    const quizIndex = courses.indexOf(c);
                    return (quizQueries[quizIndex]?.data?.quizzes || []).some(
                        (cq) => cq.id === quiz.id
                    );
                });
                return { ...quiz, course };
            })
            .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())
            .slice(0, 3);
    }, [allQuizzes, courses, quizQueries]);

    // Determine default tab based on availability
    const defaultTab = useMemo(() => {
        if (activeQuizzes.length > 0) return "active";
        if (upcomingQuizzes.length > 0) return "upcoming";
        return "completed";
    }, [activeQuizzes, upcomingQuizzes]);

    const handleNavigation = (path: string, label: string) => {
        track("faculty_dashboard_navigation", { path, label });
        router.push(path);
    };

    const handleQuizClick = (quizId: string, courseId: string, quizName: string) => {
        track("faculty_quiz_clicked_from_dashboard", { quizId, courseId, quizName });
        router.push(`/course/${courseId}/quiz/${quizId}/results`);
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

            {/* Recent Quizzes & Quick Actions Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Quizzes */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Clock className="h-5 w-5" />
                                Recent Quizzes
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleNavigation("/course", "View All Quizzes")}
                            >
                                View All
                                <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue={defaultTab} className="w-full">
                            <TabsList className="w-full grid grid-cols-3 mb-4">
                                <TabsTrigger value="active" className="gap-2">
                                    <PlayCircle className="h-4 w-4" />
                                    Active
                                    {activeQuizzes.length > 0 && (
                                        <Badge variant="secondary" className="ml-1">
                                            {activeQuizzes.length}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="upcoming" className="gap-2">
                                    <Clock className="h-4 w-4" />
                                    Upcoming
                                    {upcomingQuizzes.length > 0 && (
                                        <Badge variant="secondary" className="ml-1">
                                            {upcomingQuizzes.length}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="completed" className="gap-2">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Completed
                                    {completedQuizzes.length > 0 && (
                                        <Badge variant="secondary" className="ml-1">
                                            {completedQuizzes.length}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="active" className="mt-0">
                                {activeQuizzes.length > 0 ? (
                                    <div className="space-y-3">
                                        {activeQuizzes.map((quiz) => (
                                            <Card
                                                key={quiz.id}
                                                className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-green-500 dark:border-l-green-400"
                                                onClick={() =>
                                                    quiz.course &&
                                                    handleQuizClick(
                                                        quiz.id,
                                                        quiz.course.id,
                                                        quiz.name
                                                    )
                                                }
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-semibold text-sm line-clamp-1">
                                                                    {quiz.name}
                                                                </h3>
                                                                <Badge
                                                                    variant="default"
                                                                    className="bg-green-500 hover:bg-green-600 text-xs"
                                                                >
                                                                    Live
                                                                </Badge>
                                                            </div>
                                                            {quiz.course && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    {quiz.course.name} (
                                                                    {quiz.course.code})
                                                                </p>
                                                            )}
                                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    Ends{" "}
                                                                    {new Date(
                                                                        quiz.endTime
                                                                    ).toLocaleTimeString([], {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                    })}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <FileQuestion className="h-3 w-3" />
                                                                    {quiz.questionCount || 0}{" "}
                                                                    questions
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <PlayCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No active quizzes</p>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="upcoming" className="mt-0">
                                {upcomingQuizzes.length > 0 ? (
                                    <div className="space-y-3">
                                        {upcomingQuizzes.map((quiz) => (
                                            <Card
                                                key={quiz.id}
                                                className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-blue-500 dark:border-l-blue-400"
                                                onClick={() =>
                                                    quiz.course &&
                                                    handleQuizClick(
                                                        quiz.id,
                                                        quiz.course.id,
                                                        quiz.name
                                                    )
                                                }
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-semibold text-sm line-clamp-1">
                                                                    {quiz.name}
                                                                </h3>
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-xs"
                                                                >
                                                                    Upcoming
                                                                </Badge>
                                                            </div>
                                                            {quiz.course && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    {quiz.course.name} (
                                                                    {quiz.course.code})
                                                                </p>
                                                            )}
                                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                                <span className="flex items-center gap-1">
                                                                    <CalendarIcon className="h-3 w-3" />
                                                                    {new Date(
                                                                        quiz.startTime
                                                                    ).toLocaleDateString()}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {new Date(
                                                                        quiz.startTime
                                                                    ).toLocaleTimeString([], {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                    })}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <FileQuestion className="h-3 w-3" />
                                                                    {quiz.questionCount || 0}{" "}
                                                                    questions
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No upcoming quizzes</p>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="completed" className="mt-0">
                                {completedQuizzes.length > 0 ? (
                                    <div className="space-y-3">
                                        {completedQuizzes.map((quiz) => (
                                            <Card
                                                key={quiz.id}
                                                className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-gray-300 dark:border-l-gray-600"
                                                onClick={() =>
                                                    quiz.course &&
                                                    handleQuizClick(
                                                        quiz.id,
                                                        quiz.course.id,
                                                        quiz.name
                                                    )
                                                }
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-semibold text-sm line-clamp-1">
                                                                    {quiz.name}
                                                                </h3>
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="text-xs"
                                                                >
                                                                    Completed
                                                                </Badge>
                                                            </div>
                                                            {quiz.course && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    {quiz.course.name} (
                                                                    {quiz.course.code})
                                                                </p>
                                                            )}
                                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                                <span className="flex items-center gap-1">
                                                                    <CalendarIcon className="h-3 w-3" />
                                                                    Ended{" "}
                                                                    {new Date(
                                                                        quiz.endTime
                                                                    ).toLocaleDateString()}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <FileQuestion className="h-3 w-3" />
                                                                    {quiz.questionCount || 0}{" "}
                                                                    questions
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No completed quizzes</p>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
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
