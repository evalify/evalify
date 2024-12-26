import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
import { Card } from "@/components/ui/card";
import { 
    BookOpen, 
    Users, 
    FileQuestion, 
    Calendar,
    Clock,
} from "lucide-react";
import QuickActions from "./_components/QuickActions";
import StatsCard from "./_components/StatsCard";
import RecentQuizCard from "./_components/RecentQuizCard";
import ActiveCoursesCard from "./_components/ActiveCoursesCard";

export default async function StaffDashboard() {
    const session = await auth();
    if (!session?.user?.email) return null;

    const staff = await prisma.staff.findFirst({
        where: { user: { email: session.user.email } },
        include: {
            user: true,
            courses: {
                where: { isactive: true },
                include: { class: true }
            },
            Quiz: {
                take: 5,
                orderBy: { 
                    startTime: 'desc'  // Changed from createdAt to startTime
                },
                include: { courses: true }
            }
        }
    });

    if (!staff) return null;

    const stats = {
        totalCourses: staff.courses.length,
        totalStudents: staff.courses.reduce((acc, course) => 
            acc + (course.class?.studentCount || 0), 0),
        totalQuizzes: staff.Quiz.length,  // Changed from quizzes to Quiz
        activeQuizzes: staff.Quiz.filter(quiz =>   // Changed from quizzes to Quiz
            new Date(quiz.endTime) > new Date()).length
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Welcome back, {staff.user?.name}</h1>
                    <p className="text-muted-foreground mt-1">
                        Here's what's happening with your courses today.
                    </p>
                </div>
                <QuickActions />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard 
                    title="Total Courses"
                    value={stats.totalCourses}
                    icon={<BookOpen className="h-6 w-6" />}
                    trend="+2 this semester"
                />
                <StatsCard 
                    title="Total Students"
                    value={stats.totalStudents}
                    icon={<Users className="h-6 w-6" />}
                    trend="+12 this week"
                />
                <StatsCard 
                    title="Total Quizzes"
                    value={stats.totalQuizzes}
                    icon={<FileQuestion className="h-6 w-6" />}
                    trend="+5 this month"
                />
                <StatsCard 
                    title="Active Quizzes"
                    value={stats.activeQuizzes}
                    icon={<Clock className="h-6 w-6" />}
                    trend="2 ending soon"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Quizzes */}
                <div className="lg:col-span-2">
                    <RecentQuizCard quizzes={staff.Quiz} />  {/* Changed from quizzes to Quiz */}
                </div>

                {/* Active Courses */}
                <div className="lg:col-span-1">
                    <ActiveCoursesCard courses={staff.courses} />
                </div>
            </div>

            {/* Calendar Section */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Upcoming Schedule</h2>
                    <Calendar className="h-5 w-5 text-gray-500" />
                </div>
                {/* Add Calendar Component Here */}
            </Card>

        </div>
    );
}