"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { 
    CalendarIcon, Clock, Target, Activity, AlertCircle, 
    Loader2, BookOpen, TrendingUp, TrendingDown, Minus,
    GraduationCap, School, CheckCircle, ArrowRight
} from "lucide-react"
import { format } from "date-fns"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

type DashboardData = {
    coursePerformance: {
        id: string;
        name: string;
        code: string;
        totalQuizzes: number;
        attemptedQuizzes: number;
        missedQuizzes: number;
        averageScore: number;
        lastQuizScore: number;
        improvement: number;
    }[];
    recentResults: any[];
    upcomingQuizzes: any[];
    liveQuizzes: any[];
    studentInfo: {
        name: string;
        class: string;
    };
};

export default function DashboardPage() {
    const { data: session } = useSession()
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const response = await fetch('/api/student/dashboard')
                const data = await response.json()
                if (response.ok) {
                    setDashboardData(data)
                } else {
                    setError(data.error || 'Failed to fetch dashboard data')
                }
            } catch (err) {
                setError('Failed to load dashboard')
            } finally {
                setLoading(false)
            }
        }
        fetchDashboard()
    }, [])

    if (loading) return <LoadingState />
    if (error) return <ErrorState error={error} />

    // Determine if there's any important notification to show
    const hasLiveQuizzes = dashboardData?.liveQuizzes?.length > 0
    const hasCourses = dashboardData?.coursePerformance?.length > 0

    return (
        <div className="container py-8">
            <div className="space-y-8">
                {/* Header with Welcome */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                            Welcome back, {session?.user.name}
                        </h1>
                        <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                            <School className="h-4 w-4" />
                            <span>{dashboardData?.studentInfo?.class}</span>
                        </div>
                    </div>
                    
                    <Button 
                        onClick={() => router.push('/student/course')} 
                        className="md:self-end"
                        variant="outline"
                    >
                        View All Courses
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>

                {/* Live Quizzes Alert - With modern styling */}
                {hasLiveQuizzes && (
                    <div className="relative overflow-hidden rounded-lg border bg-gradient-to-r from-red-500/10 via-red-500/5 to-background border-red-500/20 shadow-sm">
                        <div className="absolute top-0 right-0 h-20 w-20 rotate-12 translate-x-2 -translate-y-2 bg-red-500/10 blur-2xl rounded-full"></div>
                        <div className="px-6 py-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                                    <Activity className="h-5 w-5 text-red-500 dark:text-red-400" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-lg mb-1">Live Quizzes Available!</h2>
                                    <p className="text-sm text-muted-foreground">
                                        You have {dashboardData?.liveQuizzes.length} active {dashboardData?.liveQuizzes.length === 1 ? 'quiz' : 'quizzes'} that {dashboardData?.liveQuizzes.length === 1 ? 'requires' : 'require'} your attention.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {dashboardData?.liveQuizzes.map((quiz) => (
                                    <Card key={quiz.id} className="bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-red-200 dark:border-red-800/30">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base">{quiz.title}</CardTitle>
                                            <CardDescription>{quiz.courses[0]?.name}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="pb-3">
                                            <div className="flex items-center text-xs text-muted-foreground">
                                                <Clock className="mr-1 h-3 w-3" />
                                                Ends: {format(new Date(quiz.endTime), 'h:mm a')}
                                            </div>
                                        </CardContent>
                                        <CardFooter className="pt-0">
                                            <Button 
                                                className="w-full"
                                                onClick={() => router.push(`/student/quiz?status=live`)}
                                                variant="default"
                                            >
                                                Start Now
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Course Performance Section */}
                {hasCourses && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Course Performance</h2>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-sm"
                                onClick={() => router.push('/student/course')}
                            >
                                View All
                                <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                        </div>
                        
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {dashboardData?.coursePerformance.map((course) => (
                                <Card 
                                    key={course.id} 
                                    className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => router.push(`/student/course/${course.id}`)}
                                >
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <CardTitle>{course.code}</CardTitle>
                                            <div className="flex items-center gap-1">
                                                {course.improvement > 0 ? (
                                                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                                                ) : course.improvement < 0 ? (
                                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                                ) : (
                                                    <Minus className="h-4 w-4 text-gray-500" />
                                                )}
                                            </div>
                                        </div>
                                        <CardDescription>{course.name}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pb-3">
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground">Progress</span>
                                                    <span className="font-medium">{course.attemptedQuizzes}/{course.totalQuizzes} Quizzes</span>
                                                </div>
                                                <Progress 
                                                    value={course.totalQuizzes ? (course.attemptedQuizzes / course.totalQuizzes) * 100 : 0} 
                                                    className="h-2" 
                                                />
                                            </div>
                                            
                                            {/* <div className="flex items-center justify-between">
                                                <div className="text-sm">
                                                    <span className="text-muted-foreground">Score</span>
                                                    <div className="font-medium">
                                                        {course.averageScore.toFixed(1)} pts
                                                    </div>
                                                </div>
                                                <Badge 
                                                    className={`flex gap-1 items-center ${
                                                        course.improvement > 0 
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50' 
                                                            : course.improvement < 0 
                                                            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50' 
                                                            : 'bg-secondary/50'
                                                    }`}
                                                    variant="outline"
                                                >
                                                    {course.improvement > 0 ? (
                                                        <>
                                                            <TrendingUp className="h-3 w-3" />
                                                            +{course.improvement.toFixed(1)}
                                                        </>
                                                    ) : course.improvement < 0 ? (
                                                        <>
                                                            <TrendingDown className="h-3 w-3" />
                                                            {course.improvement.toFixed(1)}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Minus className="h-3 w-3" />
                                                            0
                                                        </>
                                                    )}
                                                </Badge>
                                            </div> */}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Upcoming and Recent Results Row */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Upcoming Quizzes - Modern Card */}
                    <Card className="overflow-hidden">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Upcoming Quizzes</CardTitle>
                                <CardDescription>Scheduled assessments</CardDescription>
                            </div>
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                <CalendarIcon className="h-4 w-4 text-primary" />
                            </div>
                        </CardHeader>
                        
                        <ScrollArea className="h-[360px]">
                            <CardContent>
                                {dashboardData?.upcomingQuizzes?.length ? (
                                    <div className="space-y-4">
                                        {dashboardData.upcomingQuizzes.map((quiz) => (
                                            <div 
                                                key={quiz.id} 
                                                className="group flex items-center gap-4 rounded-lg border bg-card p-3 transition-colors hover:bg-accent hover:text-accent-foreground"
                                            >
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20">
                                                    <BookOpen className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <p className="font-medium">{quiz.title}</p>
                                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                        <span>{quiz.courses[0]?.name}</span>
                                                        <span className="flex h-1 w-1 rounded-full bg-muted-foreground"></span>
                                                        <span className="flex items-center">
                                                            <Clock className="mr-1 h-3 w-3" />
                                                            {format(new Date(quiz.startTime), 'MMM d, h:mm a')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                            <CalendarIcon className="h-6 w-6 text-primary opacity-70" />
                                        </div>
                                        <h3 className="mt-4 text-lg font-medium">No upcoming quizzes</h3>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            You're all caught up! Check back later.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </ScrollArea>
                    </Card>

                    {/* Recent Results - Modern Card */}
                    <Card className="overflow-hidden">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Recent Results</CardTitle>
                                <CardDescription>Your quiz performance</CardDescription>
                            </div>
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                <Target className="h-4 w-4 text-primary" />
                            </div>
                        </CardHeader>
                        
                        <ScrollArea className="h-[360px]">
                            <CardContent>
                                {dashboardData?.recentResults?.length ? (
                                    <div className="space-y-4">
                                        {dashboardData.recentResults.map((result) => (
                                            <div 
                                                key={result.id}
                                                onClick={() => router.push(`/student/quiz/result/${result.quizId}`)}
                                                className="group flex items-center justify-between gap-4 rounded-lg border bg-card p-3 transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20">
                                                        <CheckCircle className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <p className="font-medium">{result.quiz.title}</p>
                                                        <span className="text-sm text-muted-foreground">{result.quiz.courses[0]?.name}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-col items-end">
                                                    <div className="font-medium">
                                                        {result.score}/{result.totalScore}
                                                    </div>
                                                    <div className="w-16 mt-1">
                                                        <Progress
                                                            value={(result.score / result.totalScore) * 100}
                                                            className="h-1.5"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                            <Target className="h-6 w-6 text-primary opacity-70" />
                                        </div>
                                        <h3 className="mt-4 text-lg font-medium">No results yet</h3>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Complete quizzes to see your results here
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </ScrollArea>
                    </Card>
                </div>
            </div>
        </div>
    )
}

// Update the loading and error states for a more modern look
const LoadingState = () => (
    <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    </div>
)

const ErrorState = ({ error }: { error: string }) => (
    <div className="flex h-screen items-center justify-center">
        <Card className="max-w-md w-full">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <CardTitle>Error Loading Dashboard</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{error}</p>
            </CardContent>
            <CardFooter>
                <Button 
                    onClick={() => window.location.reload()} 
                    className="w-full"
                >
                    Try Again
                </Button>
            </CardFooter>
        </Card>
    </div>
)

