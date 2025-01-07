"use client"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { 
  CalendarIcon, 
  Clock, 
  Target, 
  Activity,
  AlertCircle,
  Loader2
} from "lucide-react"
import { format } from "date-fns"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"

type CustomTooltipProps = {
  active?: boolean;
  payload?: { payload: { missed?: boolean; score: number; totalScore: number } }[];
  label?: string | number;
};

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-md">
        <p className="text-sm font-medium text-foreground">
          {format(new Date(label), 'MMMM dd, yyyy')}
        </p>
        <p className="text-sm text-muted-foreground">
          Score: <span className="font-medium text-primary">
            {payload[0].payload.missed ? 'Missed' : `${payload[0].value.toFixed(1)}%`}
          </span>
        </p>
        {!payload[0].payload.missed && (
          <p className="text-xs text-muted-foreground">
            ({payload[0].payload.score}/{payload[0].payload.totalScore})
          </p>
        )}
      </div>
    );
  }
  return null;
};

type DashboardData = {
  recentResults: {
    id: string;
    score: number;
    totalScore: number;
    quizId: string;
    quiz: {
      title: string;
      courses: { name: string }[];
    };
  }[];
  upcomingQuizzes: {
    id: string;
    title: string;
    startTime: string;
    courses: { name: string }[];
  }[];
  liveQuizzes: {
    id: string;
    title: string;
    endTime: string;
    courses: { name: string }[];
  }[];
  performanceData: {
    averageScore: number;
    totalQuizzes: number;
    completedQuizzes: number;
    missedQuizzes: number;
    scoreHistory: {
      date: string;
      normalizedScore: number;
      score: number;
      totalScore: number;
    }[];
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
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
  }

  const stats = [
    {
      title: "Total Quizzes",
      value: dashboardData?.performanceData?.totalQuizzes || "0",
      icon: Target,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
    },
    {
      title: "Completed Quizzes",
      value: dashboardData?.performanceData?.completedQuizzes || "0",
      icon: Clock,
      color: "text-emerald-400",
      bgColor: "bg-emerald-400/10",
    },
    {
      title: "Missed Quizzes",
      value: dashboardData?.performanceData?.missedQuizzes || "0",
      icon: AlertCircle,
      color: "text-red-400",
      bgColor: "bg-red-400/10",
    },
    {
      title: "Average Score",
      value: (dashboardData?.performanceData?.averageScore || 0).toFixed(1),
      suffix: "%",
      icon: Activity,
      color: "text-purple-400",
      bgColor: "bg-purple-400/10",
    }
  ]

  const LiveQuizzes = ({ quizzes }: { quizzes: any[] }) => (
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
                                        onClick={() => router.push(`/student/quiz/${quiz.id}`)}
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

  return (
    <div className="flex min-h-screen p-6 bg-gradient-to-br from-background via-background/50 to-secondary/5 dark:from-background dark:via-background/80 dark:to-primary/5">
      <div className="flex-1 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome back, <span className="text-primary">{session?.user?.name}</span>!
          </h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className={`${stat.bgColor} border-none`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stat.value}{stat.title === "Average Score" ? "%" : ""}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {dashboardData?.liveQuizzes?.length > 0 && (
          <LiveQuizzes quizzes={dashboardData.liveQuizzes} />
        )}

        <div className="grid gap-4 md:grid-cols-7">
          <Card className="col-span-4 dark:bg-card/50">
            <CardHeader>
              <CardTitle>Performance Trend</CardTitle>
              <CardDescription>Your quiz scores over time</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {dashboardData?.performanceData?.scoreHistory?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardData.performanceData.scoreHistory}>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="normalizedScore" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ 
                        fill: "hsl(var(--primary))", 
                        strokeWidth: 2,
                        r: (props: any) => props.payload.missed ? 4 : 6 
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No performance data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-3 dark:bg-card/50">
            <CardHeader>
              <CardTitle>Upcoming Quizzes</CardTitle>
              <CardDescription>Your next scheduled assessments</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData?.upcomingQuizzes?.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.upcomingQuizzes.map((quiz: any) => (
                    <div key={quiz.id} className="flex items-center space-x-4 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{quiz.title}</p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          {format(new Date(quiz.startTime), 'PPp')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-[100px] items-center justify-center text-muted-foreground">
                  No upcoming quizzes
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="col-span-full dark:bg-card/50">
          <CardHeader>
            <CardTitle>Recent Results</CardTitle>
            <CardDescription>Your latest quiz performances</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData?.recentResults?.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dashboardData.recentResults.map((result: any) => (
                  <Card 
                    key={result.id} 
                    className="border-none bg-muted/50 dark:bg-muted/20 cursor-pointer hover:bg-muted dark:hover:bg-muted/30 transition-colors"
                    onClick={() => router.push(`/student/quiz/result/${result.quizId}`)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{result.quiz.title}</CardTitle>
                      <CardDescription>{result.quiz.courses[0]?.name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">
                          {result.score}/{result.totalScore}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex h-[100px] items-center justify-center text-muted-foreground">
                No recent results available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

