'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertCircle, CheckCircle, X } from 'lucide-react'
import { LatexPreview } from '@/components/latex-preview'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

type QuizSettings = {
    showResult: boolean
}

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
    const settings = result.quiz?.settings || { showResult: true }
    const totalMarks = questions.reduce((sum: number, q: any) => sum + q.marks, 0)
    const scorePercentage = (result.score / totalMarks) * 100

    return (
        <div className="container mx-auto py-8 space-y-8">
            <Button variant="ghost" onClick={() => router.push('/student/quiz')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Quizzes
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>Quiz Result</CardTitle>
                    <CardDescription>Your performance summary</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Score Overview</h3>
                            <p><strong>Total Score:</strong> {result.score} / {totalMarks}</p>
                            <Progress value={scorePercentage} className="mt-2" />
                            <p className="text-sm text-muted-foreground mt-1">{scorePercentage.toFixed(2)}% Correct</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {settings.showResult ? (
                <Tabs defaultValue="all" className="w-full">
                    <TabsList>
                        <TabsTrigger value="all">All Questions</TabsTrigger>
                        <TabsTrigger value="incorrect">Incorrect Answers</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all">
                        <QuestionList
                            questions={questions}
                            responses={result.responses}
                        />
                    </TabsContent>
                    <TabsContent value="incorrect">
                        <QuestionList
                            questions={questions.filter((q: any) => 
                                !isQuestionCorrect(q, result.responses[q._id])
                            )}
                            responses={result.responses}
                        />
                    </TabsContent>
                </Tabs>
            ) : (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center text-muted-foreground">
                            Detailed results are not available for this quiz
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

function QuestionList({ questions, responses }: { questions: any[], responses: Record<string, any> }) {
    return (
        <ScrollArea className="rounded-md border p-4">
            <div className="space-y-8">
                {questions.map((question, index) => (
                    <QuestionCard
                        key={question._id}
                        question={question}
                        response={responses[question._id]}
                        index={index}
                    />
                ))}
            </div>
        </ScrollArea>
    )
}

function QuestionCard({ question, response, index }: { question: any, response: any, index: number }) {
    const isCorrect = isQuestionCorrect(question, response)

    return (
        <Card className="relative">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle>Question {index + 1}</CardTitle>
                    {isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <LatexPreview content={question.question} />
                    <OptionsDisplay
                        options={question.options}
                        correctAnswers={question.answer}
                        studentAnswers={response?.answer || []}
                    />
                    {question.explanation && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                            <strong>Explanation:</strong>
                            <LatexPreview content={question.explanation} />
                        </div>
                    )}
                    <div className="mt-4">
                        <strong>Marks: </strong>
                        <span>{response?.marks || 0} / {question.marks}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function OptionsDisplay({ options, correctAnswers, studentAnswers }: { 
    options: any[], 
    correctAnswers: string[], 
    studentAnswers: string[] 
}) {
    if (!options?.length) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {options.map((option, index) => {
                const isCorrect = correctAnswers.includes(option.optionId)
                const isSelected = studentAnswers.includes(option.optionId)

                return (
                    <div
                        key={option.optionId}
                        className={`p-4 rounded-lg border ${
                            isCorrect && isSelected
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : isSelected && !isCorrect
                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                    : isCorrect
                                        ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10'
                                        : 'border-gray-200 dark:border-gray-700'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <span>{String.fromCharCode(65 + index)}.</span>
                            <LatexPreview content={option.option} />
                            {isCorrect && isSelected && <CheckCircle className="w-4 h-4 text-green-500" />}
                            {!isCorrect && isSelected && <X className="w-4 h-4 text-red-500" />}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function isQuestionCorrect(question: any, response: any) {
    if (!response?.answer) return false;
    const studentAnswers = Array.isArray(response.answer) ? response.answer : [response.answer];
    return Array.isArray(question.answer) &&
        studentAnswers.length === question.answer.length &&
        studentAnswers.every(ans => question.answer.includes(ans));
}