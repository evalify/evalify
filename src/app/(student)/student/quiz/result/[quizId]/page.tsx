'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertCircle, CheckCircle, X, Award } from 'lucide-react'
import { LatexPreview } from '@/components/latex-preview'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function StudentQuizResultPage() {
    const { quizId } = useParams()
    const router = useRouter()
    const [data, setData] = useState<{ result: any; questions: any[]; settings: QuizSettings } | null>(null)

    useEffect(() => {
        fetchData()
    }, [quizId])

    const fetchData = async () => {
        try {
            const response = await fetch(`/api/student/result/${quizId}`)
            const data = await response.json()
            if (response.ok) {
                setData(data)
            } else {
                toast.error(data.error)
            }
        } catch (error) {
            toast.error('Failed to fetch result data')
        }
    }

    if (!data) return <div className="flex justify-center items-center h-screen">Loading...</div>

    const { result, questions } = data
    // const responses = result.responses || {}
    const { responses, questionMarks } = result

    // Calculate total marks from questions array
    const totalMarks = questions.reduce((sum: number, q: any) => sum + (q.marks || 0), 0)
    const scorePercentage = (result.score / totalMarks) * 100

    return (
        <div className="container mx-auto py-8 space-y-8">
            <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Quizzes
            </Button>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>{result.quiz.title}</CardTitle>
                                <CardDescription>Your Quiz Results</CardDescription>
                            </div>
                            <Award className={`w-8 h-8 ${scorePercentage >= 50 ? 'text-green-500' : 'text-red-500'}`} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-2xl font-bold">{result.score} / {totalMarks}</p>
                                    <p className="text-sm text-muted-foreground">Total Score</p>
                                </div>
                                <div>
                                    <Badge variant={scorePercentage >= 50 ? "success" : "destructive"}>
                                        {scorePercentage.toFixed(1)}%
                                    </Badge>
                                </div>
                            </div>
                            <Progress value={scorePercentage} className="h-2" />
                            <Separator className="my-4" />
                            <div className="space-y-6">
                                {questions.map((question, index) => (
                                    <QuestionResult
                                        key={question._id}
                                        question={question}
                                        response={responses[question._id]}
                                        index={index}
                                        mark={questionMarks[question._id]}
                                    />
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function QuestionResult({ question, response, index,mark }: {
    question: any,
    response: { answer: string[], marks: number },
    index: number
    mark: number
}) {
    const studentAnswers = response || [];
    const correctAnswers = question.answer || [];
    const maxMarks = question.marks || 0;
    const obtainedMarks = mark || 0;

    return (
        <div className="space-y-4 p-4 rounded-lg border">
            <div className="flex items-center justify-between">
                <h3 className="font-medium">Question {index + 1}</h3>
                <div className="flex items-center gap-2">
                    <Badge variant={obtainedMarks > 0 ? "success" : "destructive"}>
                        {obtainedMarks} / {maxMarks} marks
                    </Badge>
                </div>
            </div>

            <div className="pl-4 border-l-2 border-muted">
                <LatexPreview content={question.question} />
            </div>

            <div className="grid gap-2">
                {question.options.map((option: any, optIndex: number) => {
                    const isCorrectOption = correctAnswers.includes(option.optionId);
                    const isSelected = studentAnswers.includes(option.optionId) || false;
                    return (
                        <div
                            key={option.optionId}
                            className={`p-3 rounded-md flex items-center gap-3 ${isSelected && isCorrectOption ? 'bg-green-50 border border-green-500 dark:bg-green-900' :
                                isSelected ? 'bg-red-50 border border-red-500 dark:bg-red-900' :
                                    isCorrectOption ? 'bg-green-50 border border-green-200 dark:bg-green-900' :
                                        'bg-muted/50 border border-muted'
                                }`}
                        >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm border
                                ${isSelected ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                                {String.fromCharCode(65 + optIndex)}
                            </div>
                            <LatexPreview content={option.option} />
                            <div className="ml-auto flex items-center gap-2">
                                {isSelected && (
                                    <span className="text-sm">
                                        {isCorrectOption ? "Your correct answer" : "Your incorrect answer"}
                                    </span>
                                )}
                                {!isSelected && isCorrectOption && (
                                    <span className="text-sm text-green-600">
                                        Correct answer
                                    </span>
                                )}
                                {isSelected && isCorrectOption && (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                )}
                                {isSelected && !isCorrectOption && (
                                    <X className="w-4 h-4 text-red-500" />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {question.explanation && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="font-medium mb-2">Explanation:</p>
                    <LatexPreview content={question.explanation} />
                </div>
            )}
        </div>
    );
}