"use client"

import React, { useEffect, useState } from 'react'
import { RefreshCw, ClipboardList, Calendar, Clock, User, AlarmClock, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useRouter } from 'next/navigation'

type QuizInfo = {
    id: string
    title: string
    description: string
    startTime: string
    endTime: string
    duration: string
    staff: {
        name: string
        id: string
    }
}



/**
 * Triggers the download of a file from the public directory.
 *
 * @param filePath - The relative path to the file in the public directory (e.g., "/files/sample.pdf").
 */
const downloadFileFromPublicDir = (filePath: string) => {
    const anchor = document.createElement("a");
    anchor.href = filePath;
    anchor.download = filePath.split("/").pop() || "file";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
};


const handleDownload = () => {
    downloadFileFromPublicDir("/LA_TEST1.pdf");
};


function Page() {
    const [quizInfo, setQuizInfo] = useState<QuizInfo[] | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)


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

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 space-y-4">
                <Skeleton className="h-12 w-[250px]" />
                {[...Array(3)].map((_, i) => (
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

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <p className="text-red-500">Failed to load quizzes</p>
                <Button onClick={() => getQuiz()} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 space-y-4">
            <h1 className="text-3xl font-bold flex items-center">
                <ClipboardList className="mr-2 h-8 w-8" />
                Available Quizzes
            </h1>
            {quizInfo?.length === 0 ? (
                <Card>
                    <CardContent className="flex items-center justify-center h-32">
                        <p className="text-center text-gray-500">No quizzes available</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {quizInfo?.map((quiz) => (
                        <QuizCard key={quiz.id} {...quiz} />
                    ))}
                </div>
            )}
            <div className="p-6">
                <Button onClick={handleDownload}>Download Exam File</Button>
            </div>
        </div>
    )
}

function QuizCard({ id, title, description, startTime, endTime, duration, staff }: QuizInfo) {
    const router = useRouter()
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <BookOpen className="mr-2 h-5 w-5" />
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Start Time:</span>
                            <span className="ml-2 text-sm">{new Date(startTime).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">End Time:</span>
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
                <Button className="w-full"
                    onClick={() => router.push(`/quiz/${id}`)}>
                    <AlarmClock className="mr-2 h-4 w-4" />
                    Start Quiz
                </Button>
            </CardFooter>
        </Card>
    )
}

export default Page

