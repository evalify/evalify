"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Users,
    GraduationCap,
    BookOpen,
    Building2,
    Calendar,
    TrendingUp,
    ArrowUpRight,
    BarChart3,
    PieChart,
    Target,
    Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAnalytics } from "@/hooks/use-analytics";
import { trpc } from "@/lib/trpc/client";
import { useMemo } from "react";

interface DashboardStats {
    totalUsers: number;
    activeUsers: number;
    students: number;
    faculty: number;
    admins: number;
    totalDepartments: number;
    totalBatches: number;
    activeBatches: number;
    totalSemesters: number;
    activeSemesters: number;
    totalCourses: number;
    activeCourses: number;
}

interface DepartmentWithStats {
    id: string;
    name: string;
    isActive: "ACTIVE" | "INACTIVE";
    batchCount: number;
    studentCount: number;
}

export default function AdminDashboard() {
    const router = useRouter();
    const { track } = useAnalytics();

    // Fetch all data using tRPC - using maximum limits to get comprehensive stats
    const { data: usersData, isLoading: isLoadingUsers } = trpc.user.list.useQuery({
        limit: 100,
        page: 1,
    });

    const { data: departmentsData, isLoading: isLoadingDepts } = trpc.department.list.useQuery({
        limit: 100,
        offset: 0,
    });

    const { data: batchesData, isLoading: isLoadingBatches } = trpc.batch.list.useQuery({
        limit: 100,
        offset: 0,
    });

    const { data: semestersData, isLoading: isLoadingSemesters } = trpc.semester.list.useQuery({
        limit: 100,
        offset: 0,
    });

    const { data: coursesData, isLoading: isLoadingCourses } = trpc.course.list.useQuery({
        limit: 100,
        offset: 0,
    });

    // Compute dashboard stats from the data - using total counts from API responses
    const stats = useMemo((): DashboardStats | null => {
        if (!usersData || !departmentsData || !batchesData || !semestersData || !coursesData) {
            return null;
        }

        const users = usersData.users || [];
        const departments = departmentsData.departments || [];
        const batches = batchesData.batches || [];
        const semesters = semestersData.semesters || [];
        const courses = coursesData.courses || [];

        return {
            // Use total counts from API responses if available, otherwise use array length
            totalUsers: usersData.total || users.length,
            activeUsers: users.filter((u) => u.status === "ACTIVE").length,
            students: users.filter((u) => u.role === "STUDENT").length,
            faculty: users.filter((u) => u.role === "FACULTY").length,
            admins: users.filter((u) => u.role === "ADMIN").length,
            totalDepartments: departmentsData.total || departments.length,
            totalBatches: batchesData.total || batches.length,
            activeBatches: batches.filter((b) => b.isActive === "ACTIVE").length,
            totalSemesters: semestersData.total || semesters.length,
            activeSemesters: semesters.filter((s) => s.isActive === "ACTIVE").length,
            totalCourses: coursesData.total || courses.length,
            activeCourses: courses.filter((c) => c.isActive === "ACTIVE").length,
        };
    }, [usersData, departmentsData, batchesData, semestersData, coursesData]);

    // Compute department stats
    const departmentStats = useMemo((): DepartmentWithStats[] => {
        if (!departmentsData || !batchesData || !usersData) {
            return [];
        }

        const departments = departmentsData.departments || [];
        const batches = batchesData.batches || [];
        const users = usersData.users || [];

        return departments.map((dept) => {
            const deptBatches = batches.filter((b) => b.departmentId === dept.id);
            const deptStudents = users.filter(
                (u) => u.role === "STUDENT" && deptBatches.some((b) => b.id === u.id) // This is simplified, ideally check batch membership
            );

            return {
                id: dept.id,
                name: dept.name,
                isActive: dept.isActive,
                batchCount: deptBatches.length,
                studentCount: deptStudents.length,
            };
        });
    }, [departmentsData, batchesData, usersData]);

    const isLoading =
        isLoadingUsers ||
        isLoadingDepts ||
        isLoadingBatches ||
        isLoadingSemesters ||
        isLoadingCourses;

    const handleNavigation = (path: string, label: string) => {
        track("dashboard_navigation", { path, label });
        router.push(path);
    };

    if (isLoading || !stats) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-black dark:text-white">
                            Admin Dashboard
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
                    </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                <div className="h-4 w-4 bg-gray-200 rounded"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 bg-gray-200 rounded w-1/3 mb-1"></div>
                                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-gray-50 dark:bg-black min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-black dark:text-white">
                        Admin Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Overview of your platform&apos;s performance and activities
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => handleNavigation("/admin/user", "Manage Users")}
                    >
                        <Users className="h-4 w-4 mr-2" />
                        Manage Users
                    </Button>
                    <Button
                        onClick={() => handleNavigation("/admin/batch", "Manage Batches")}
                        className="bg-black hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    >
                        <GraduationCap className="h-4 w-4 mr-2" />
                        Quick Actions
                    </Button>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card
                    className="border border-blue-200 dark:border-blue-800 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => handleNavigation("/admin/user", "Users Overview")}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            Total Users
                        </CardTitle>
                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {stats.totalUsers.toLocaleString()}
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {stats.activeUsers} active users
                        </p>
                    </CardContent>
                </Card>

                <Card
                    className="border border-green-200 dark:border-green-800 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => handleNavigation("/admin/batch", "Batches Overview")}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                            Student Batches
                        </CardTitle>
                        <GraduationCap className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                            {stats.totalBatches}
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center mt-1">
                            <Target className="h-3 w-3 mr-1" />
                            {stats.activeBatches} active batches
                        </p>
                    </CardContent>
                </Card>

                <Card
                    className="border border-purple-200 dark:border-purple-800 bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => handleNavigation("/admin/course", "Courses Overview")}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                            Courses
                        </CardTitle>
                        <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                            {stats.totalCourses}
                        </div>
                        <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center mt-1">
                            <Zap className="h-3 w-3 mr-1" />
                            {stats.activeCourses} currently active
                        </p>
                    </CardContent>
                </Card>

                <Card
                    className="border border-orange-200 dark:border-orange-800 bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => handleNavigation("/admin/department", "Departments Overview")}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
                            Departments
                        </CardTitle>
                        <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                            {stats.totalDepartments}
                        </div>
                        <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center mt-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            {stats.activeSemesters} active semesters
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Stats Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* User Breakdown */}
                <Card className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            User Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm">Students</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{stats.students}</span>
                                <Badge variant="secondary">
                                    {stats.totalUsers
                                        ? Math.round((stats.students / stats.totalUsers) * 100)
                                        : 0}
                                    %
                                </Badge>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm">Faculty</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{stats.faculty}</span>
                                <Badge variant="secondary">
                                    {Math.round((stats.faculty / stats.totalUsers) * 100)}%
                                </Badge>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                                <span className="text-sm">Administrators</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{stats.admins}</span>
                                <Badge variant="secondary">
                                    {Math.round((stats.admins / stats.totalUsers) * 100)}%
                                </Badge>
                            </div>
                        </div>
                        <div className="pt-2 border-t">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">
                                    Active Users
                                </span>
                                <span className="font-medium text-green-600 dark:text-green-400">
                                    {stats.activeUsers}/{stats.totalUsers}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Course & Batch Stats */}
                <Card className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="h-5 w-5" />
                            Academic Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Total Batches</span>
                                <span className="font-medium">{stats.totalBatches}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Total Courses</span>
                                <span className="font-medium">{stats.totalCourses}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Total Semesters</span>
                                <span className="font-medium">{stats.totalSemesters}</span>
                            </div>
                        </div>
                        <div className="pt-2 border-t space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">
                                    Active Courses
                                </span>
                                <Badge variant="outline">{stats.activeCourses}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">
                                    Active Batches
                                </span>
                                <Badge variant="outline">{stats.activeBatches}</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* System Stats */}
                <Card className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            System Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Departments</span>
                                <span className="font-medium">{stats.totalDepartments}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Active Semesters</span>
                                <span className="font-medium">{stats.activeSemesters}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Total Semesters</span>
                                <span className="font-medium">{stats.totalSemesters}</span>
                            </div>
                        </div>
                        <div className="pt-2 border-t">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">
                                    Platform Status
                                </span>
                                <Badge
                                    variant="outline"
                                    className="text-green-600 border-green-600"
                                >
                                    Active
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Department Statistics */}
            {departmentStats && departmentStats.length > 0 && (
                <Card className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Department Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {departmentStats.map((dept) => (
                                <div
                                    key={dept.id}
                                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
                                    onClick={() =>
                                        handleNavigation(
                                            `/admin/department`,
                                            `${dept.name} Department`
                                        )
                                    }
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                            {dept.name}
                                        </h3>
                                        <Badge
                                            variant={
                                                dept.isActive === "ACTIVE" ? "default" : "secondary"
                                            }
                                            className="text-xs"
                                        >
                                            {dept.isActive}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="flex items-center gap-1">
                                            <GraduationCap className="h-3 w-3 text-gray-500" />
                                            <span className="text-gray-600 dark:text-gray-400">
                                                {dept.batchCount} batches
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Users className="h-3 w-3 text-gray-500" />
                                            <span className="text-gray-600 dark:text-gray-400">
                                                {dept.studentCount} students
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick Action Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card
                    className="bg-linear-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-800 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => handleNavigation("/admin/user", "Add New User")}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                                    Add New User
                                </p>
                                <p className="text-xs text-indigo-600 dark:text-indigo-400">
                                    Register students & faculty
                                </p>
                            </div>
                            <ArrowUpRight className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="bg-linear-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => handleNavigation("/admin/batch", "Create Batch")}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                    Create Batch
                                </p>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                    Set up new student groups
                                </p>
                            </div>
                            <ArrowUpRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="bg-linear-to-br from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/20 border-violet-200 dark:border-violet-800 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => handleNavigation("/admin/semester", "Manage Semesters")}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                                    Manage Courses
                                </p>
                                <p className="text-xs text-violet-600 dark:text-violet-400">
                                    Add & organize courses
                                </p>
                            </div>
                            <ArrowUpRight className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="bg-linear-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => handleNavigation("/settings", "System Settings")}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                    System Settings
                                </p>
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    Configure platform
                                </p>
                            </div>
                            <ArrowUpRight className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
