'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, School } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface DashboardStats {
    studentCount: number;
    staffCount: number;
    courseCount: number;
    classCount: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats>({
        studentCount: 0,
        staffCount: 0,
        courseCount: 0,
        classCount: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [studentsRes, staff, courses, classes] = await Promise.all([
                    fetch('/api/admin/students?dashboard=true').then(res => res.json()),
                    fetch('/api/admin/staff').then(res => res.json()),
                    fetch('/api/admin/courses').then(res => res.json()),
                    fetch('/api/admin/classes').then(res => res.json())
                ]);

                setStats({
                    studentCount: studentsRes.total,
                    staffCount: Array.isArray(staff) ? staff.length : 0,
                    courseCount: Array.isArray(courses) ? courses.length : 0,
                    classCount: Array.isArray(classes) ? classes.length : 0
                });
            } catch (error) {
                console.log('Error fetching stats:', error);
                setStats({
                    studentCount: 0,
                    staffCount: 0,
                    courseCount: 0,
                    classCount: 0
                });
            }
        };

        fetchStats();
    }, []);

    const dashboardItems = [
        {
            title: "Students",
            value: stats.studentCount,
            icon: Users,
            link: "/admin/students",
            color: "text-blue-600"
        },
        {
            title: "Staff",
            value: stats.staffCount,
            icon: GraduationCap,
            link: "/admin/staffs",
            color: "text-green-600"
        },
        {
            title: "Courses",
            value: stats.courseCount,
            icon: BookOpen,
            link: "/admin/course",
            color: "text-purple-600"
        },
        {
            title: "Classes",
            value: stats.classCount,
            icon: School,
            link: "/admin/class",
            color: "text-orange-600"
        }
    ];

    return (
        <div className="container p-6">
            <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {dashboardItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                        <Link href={item.link} key={item.title}>
                            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {item.title}
                                    </CardTitle>
                                    <IconComponent className={`h-5 w-5 ${item.color}`} />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{item.value}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Click to manage {item.title.toLowerCase()}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            No recent activity to display
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        <Link
                            href="/admin/students"
                            className="text-sm text-blue-600 hover:underline"
                        >
                            Assign Students to Class
                        </Link>
                        <Link
                            href="/admin/course"
                            className="text-sm text-blue-600 hover:underline"
                        >
                            Create New Course
                        </Link>
                        <Link
                            href="/admin/class"
                            className="text-sm text-blue-600 hover:underline"
                        >
                            Add New Class
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}