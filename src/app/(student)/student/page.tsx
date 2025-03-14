"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
    CalendarIcon, Clock, Target, Activity, AlertCircle, 
    Loader2, BookOpen, TrendingUp, TrendingDown, Minus,
    GraduationCap, School
} from "lucide-react"
import { format } from "date-fns"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

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

    return (
        <div className="min-h-screen p-6 bg-gradient-to-br from-background to-secondary/5">
            <div className="mx-auto space-y-8">
                {/* Header Section */}
                <header className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">
                        Welcome back, <span className="text-primary">{session?.user.name}</span>!
                    </h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <School className="h-4 w-4" />
                        <span>{dashboardData?.studentInfo?.class}</span>
                    </div>
                </header>

                {/* Live Quizzes Alert */}
                {dashboardData?.liveQuizzes?.length > 0 && (
                    <div className="animate-pulse">
                        <LiveQuizzes quizzes={dashboardData.liveQuizzes} router={router} />
                    </div>
                )}

                {/* Course Performance Cards */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {dashboardData?.coursePerformance.map((course) => (
                        <Card key={course.id} className="backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>{course.code}</span>
                                    <Badge variant={course.averageScore >= 60 ? "success" : "destructive"}>
                                        {course.averageScore.toFixed(1)}%
                                    </Badge>
                                </CardTitle>
                                <CardDescription>{course.name}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Progress value={course.averageScore} className="h-2" />
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="space-y-2">
                                        <p className="text-muted-foreground">Completed</p>
                                        <p className="text-2xl font-bold">{course.attemptedQuizzes}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-muted-foreground">Total</p>
                                        <p className="text-2xl font-bold">{course.totalQuizzes}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {course.improvement > 0 ? (
                                        <Badge variant="success" className="flex items-center gap-1">
                                            <TrendingUp className="h-3 w-3" />
                                            +{course.improvement.toFixed(1)}%
                                        </Badge>
                                    ) : course.improvement < 0 ? (
                                        <Badge variant="destructive" className="flex items-center gap-1">
                                            <TrendingDown className="h-3 w-3" />
                                            {course.improvement.toFixed(1)}%
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="flex items-center gap-1">
                                            <Minus className="h-3 w-3" />
                                            No Change
                                        </Badge>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                        from last quiz
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Bottom Grid */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Upcoming Quizzes */}
                    <Card className="backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5" />
                                Upcoming Quizzes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[300px] pr-4">
                                <div className="space-y-4">
                                    {dashboardData?.upcomingQuizzes.map((quiz) => (
                                        <div key={quiz.id} 
                                            className="flex items-center space-x-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                                        >
                                            <BookOpen className="h-4 w-4 text-primary" />
                                            <div className="flex-1 space-y-1">
                                                <p className="text-sm font-medium">{quiz.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {quiz.courses[0]?.name}
                                                </p>
                                                <div className="flex items-center text-xs text-muted-foreground">
                                                    <Clock className="mr-1 h-3 w-3" />
                                                    {format(new Date(quiz.startTime), 'PPp')}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Recent Results */}
                    <Card className="backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5" />
                                Recent Results
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[300px] pr-4">
                                <div className="space-y-4">
                                    {dashboardData?.recentResults.map((result) => (
                                        <div key={result.id}
                                            className="flex items-center space-x-4 rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                                            onClick={() => router.push(`/student/quiz/result/${result.quizId}`)}
                                        >
                                            <div className="flex-1 space-y-1">
                                                <p className="text-sm font-medium">{result.quiz.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {result.quiz.courses[0]?.name}
                                                </p>
                                            </div>
                                            <Badge variant={
                                                (result.score / result.totalScore) * 100 >= 60 
                                                    ? "success" 
                                                    : "destructive"
                                            }>
                                                {result.score}/{result.totalScore}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

// Add these component definitions at the end of the file
const LoadingState = () => (
    <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
)

const ErrorState = ({ error }: { error: string }) => (
    <div className="flex h-screen items-center justify-center">
        <Card className="w-96">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Error
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">{error}</p>
            </CardContent>
        </Card>
    </div>
)

const LiveQuizzes = ({ quizzes, router }: { quizzes: any[], router: any }) => (
    <Card className="col-span-full dark:bg-card/50">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-red-500" />
                Live Quizzes
            </CardTitle>
            <CardDescription>Currently active assessments</CardDescription>
        </CardHeader>
        <CardContent>
            {quizzes.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {quizzes.map((quiz) => (
                        <Card key={quiz.id} className="border-2 border-red-400/30 bg-red-500/5 dark:bg-red-950/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">{quiz.title}</CardTitle>
                                <CardDescription>{quiz.courses[0]?.name}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex items-center text-xs">
                                        <Clock className="mr-1 h-3 w-3" />
                                        Ends at: {format(new Date(quiz.endTime), 'PPp')}
                                    </div>
                                    <Button 
                                        className="w-full"
                                        size="sm"
                                        onClick={() => router.push(`/student/quiz?status=live`)}
                                    >
                                        Take Quiz
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="flex h-[100px] items-center justify-center text-muted-foreground">
                    No live quizzes available
                </div>
            )}
        </CardContent>
    </Card>
)

