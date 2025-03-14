"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { RefreshCw, ClipboardList, Calendar, Clock, User, AlarmClock, CheckCircle2, BookOpen, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

type QuizInfo = {
    id: string
    title: string
    description: string
    startTime: string
    endTime: string
    duration: string
    status: 'live' | 'upcoming' | 'completed' | 'missed'
    staff: {
        name: string
        id: string
    }
    settings?: {
        showResult: boolean
    }
    showResult: boolean
    isLiveQuiz: boolean
}

function QuizManagement() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const status = searchParams.get('status') || 'live'
    const [quizInfo, setQuizInfo] = useState<QuizInfo[] | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<string>(status)
    
    // Validate that status is one of the allowed values
    const validStatuses = ['live', 'upcoming', 'completed', 'missed']
    
    // Initialize the current status from the URL parameter
    useEffect(() => {
        const currentStatus = searchParams.get('status')
        if (currentStatus && validStatuses.includes(currentStatus)) {
            setActiveTab(currentStatus)
        } else {
            // Only update the URL if the status is invalid
            const newParams = new URLSearchParams(searchParams.toString())
            newParams.set('status', 'live')
            router.replace(`/student/quiz?${newParams.toString()}`)
        }
    }, [searchParams])

    async function getQuiz() {
        try {
            setIsLoading(true)
            setError(null)
            const res = await fetch('/api/student/quiz')

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`)
            }

            const data = await res.json()
            setQuizInfo(data.data)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch quiz'
            console.log('Error fetching quiz:', errorMessage)
            setError(errorMessage)
            toast.error('Failed to load quizzes')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        getQuiz()
    }, [])
    
    const handleTabChange = (value: string) => {
        setActiveTab(value)
        // Update the URL with the new status parameter
        const newParams = new URLSearchParams(searchParams.toString())
        newParams.set('status', value)
        router.push(`/student/quiz?${newParams.toString()}`)
    }

    if (isLoading) {
        return <LoadingSkeleton />
    }

    if (error) {
        return <ErrorState onRetry={getQuiz} />
    }

    return (
        <div className="container mx-auto p-4 space-y-8">
            <h1 className="text-3xl font-bold flex items-center">
                <ClipboardList className="mr-2 h-8 w-8" />
                Quizzes
            </h1>
            {quizInfo?.length === 0 ? (
                <EmptyState />
            ) : (
                <Tabs 
                    value={activeTab} 
                    className="w-full"
                    onValueChange={handleTabChange}
                >
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="live">Live</TabsTrigger>
                        <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                        <TabsTrigger value="completed">Completed</TabsTrigger>
                        <TabsTrigger value="missed">Missed</TabsTrigger>
                    </TabsList>
                    <TabsContent value="live">
                        <QuizList quizzes={quizInfo?.filter(q => q.status === 'live')} status="live" />
                    </TabsContent>
                    <TabsContent value="upcoming">
                        <QuizList quizzes={quizInfo?.filter(q => q.status === 'upcoming')} status="upcoming" />
                    </TabsContent>
                    <TabsContent value="completed">
                        <QuizList quizzes={quizInfo?.filter(q => q.status === 'completed').reverse()} status="completed" />
                    </TabsContent>
                    <TabsContent value="missed">
                        <QuizList quizzes={quizInfo?.filter(q => q.status === 'missed').reverse()} status="missed" />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    )
}

function QuizList({ quizzes, status }: { quizzes: QuizInfo[] | undefined, status: string }) {
    if (!quizzes || quizzes.length === 0) {
        return <div className="text-gray-500 text-center py-4">No {status} quizzes available</div>
    }
    
    // If there is any Live quiz, student will not be able to view the results of other quizzes
    const isLiveQuiz = quizzes.filter(q => q.status === 'live').length > 0;
    return (
        <div className="space-y-4 mt-4">
            {quizzes.map((quiz) => (
                <QuizCard key={quiz.id} {...quiz} isLiveQuiz={isLiveQuiz} />
            ))}
        </div>
    )
}

function QuizCard({ id, title, description, startTime, endTime, duration, staff, status, showResult, isLiveQuiz }: QuizInfo) {
    const router = useRouter()

    function getScore(quizId: string) {
        // Future implementation
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'live':
                return <Badge variant="default" className="bg-green-500"><AlertCircle className="mr-1 h-3 w-3" /> Live</Badge>
            case 'upcoming':
                return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> Upcoming</Badge>
            case 'completed':
                return <Badge variant="outline"><CheckCircle className="mr-1 h-3 w-3" /> Completed</Badge>
            case 'missed':
                return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Missed</Badge>
            default:
                return null
        }
    }

    return (
        <Card className="w-full hover:shadow-md transition-shadow duration-200">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center">
                        <BookOpen className="mr-2 h-5 w-5" />
                        {title}
                    </CardTitle>
                    {
                        getStatusBadge(status)
                    }
                </div>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Start:</span>
                            <span className="ml-2 text-sm">{new Date(startTime).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">End:</span>
                            <span className="ml-2 text-sm">{new Date(endTime).toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Duration:</span>
                            <span className="ml-2 text-sm">{duration}</span>
                        </div>
                        <div className="flex items-center">
                            <User className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Staff:</span>
                            <span className="ml-2 text-sm">{staff.name}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
            <Separator />
            <CardFooter className="pt-4">
                {status === 'live' ? (
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="w-full">
                                <AlarmClock className="mr-2 h-4 w-4" />
                                Start Quiz
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold text-center">
                                    Ready to Begin?
                                </DialogTitle>
                                <div className="my-4 text-center">
                                    <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
                                </div>
                                <div className="text-lg font-semibold mb-4 text-center">
                                    You're about to start the quiz: {title}
                                </div>
                                <DialogDescription className="text-center">
                                    Are you ready to proceed?
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="flex-col space-y-2 sm:space-y-0 sm:flex-row sm:space-x-2">
                                <Button variant="outline" className="w-full sm:w-auto">Not Yet</Button>
                                <Button
                                    onClick={() => router.push(`/quiz/${id}`)}
                                    className="w-full sm:w-auto bg-green-500 hover:bg-green-600"
                                >
                                    Start Now
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                ) : status === 'completed' && showResult ? (
                    <Button
                        className="w-full"
                        onClick={() => router.push(`/student/quiz/result/${id}`)}
                        disabled={isLiveQuiz}
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        View Results
                    </Button>
                ) : (
                    <Button className="w-full" disabled>
                        <AlarmClock className="mr-2 h-4 w-4" />
                        View Results
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}

function LoadingSkeleton() {
    return (
        <div className="container mx-auto p-4 space-y-4">
            <Skeleton className="h-12 w-[250px]" />
            {[...Array(5)].map((_, i) => (
                <Card key={i} className="w-full mb-4">
                    <CardHeader>
                        <Skeleton className="h-6 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-full" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <div className="text-red-500">Failed to load quizzes</div>
            <Button onClick={onRetry} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
            </Button>
        </div>
    )
}

function EmptyState() {
    return (
        <Card>
            <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-gray-500">No quizzes available</div>
            </CardContent>
        </Card>
    )
}

export default QuizManagement