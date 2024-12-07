'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Check, X, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { LatexPreview } from '@/components/latex-preview'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

type Option = {
    option: string;
    optionId: string;
}

type Question = {
    _id: string;
    question: string;
    options: Option[];
    answer: string[];
    marks: number;
    type: string;
    explanation?: string;
}

type Response = {
    [key: string]: string[];
}

type StudentResult = {
    student: {
        user: {
            name: string
            rollNo: string
        }
    }
    score: number
    responses: Record<string, Response>
    questionMarks: Record<string, number>
}

export default function StudentResultPage() {
    const { studentId } = useParams()
    const router = useRouter()
    const [data, setData] = useState<{ result: StudentResult; questions: Question[] } | null>(null)
    const [responses, setResponses] = useState<Record<string, Response>>({})
    const [editingQuestion, setEditingQuestion] = useState<string | null>(null)
    const [questionSearch, setQuestionSearch] = useState('');

    useEffect(() => {
        fetchData()
    }, [studentId])

    const fetchData = async () => {
        try {
            const response = await fetch(`/api/staff/result/${studentId}`)
            const data = await response.json()
            if (response.ok) {
                setData(data)
                setResponses(data.result.responses)
            } else {
                toast.error(data.error)
            }
        } catch (error) {
            toast.error('Failed to fetch result data')
        }
    }

    const handleMarkUpdate = async (questionId: string, marks: number) => {
        if (!data) return;
        
        // Update questionMarks
        const updatedQuestionMarks = {
            ...data.result.questionMarks,
            [questionId]: marks
        };

        // Calculate new total score
        const totalScore = Object.values(updatedQuestionMarks).reduce(
            (sum, mark) => sum + Number(mark), 0
        );

        try {
            const response = await fetch(`/api/staff/result/${studentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    responses,
                    questionMarks: updatedQuestionMarks,
                    totalScore
                })
            });

            if (response.ok) {
                toast.success('Marks updated successfully');
                fetchData(); // Refresh data to get updated totals
            } else {
                toast.error('Failed to update marks');
            }
        } catch (error) {
            toast.error('Failed to update marks');
        }
    };

    const handleEditQuestion = (questionId: string) => {
        setEditingQuestion(questionId === editingQuestion ? null : questionId);
    };

    const renderOptions = (question: Question, studentResponses: Response) => {
        if (!question.options) return (
            <div className="mt-4 text-pretty bg-slate-100 rounded-lg p-3 dark:bg-slate-900 ">
                <strong>Student's Answer:</strong>
                <pre className='ml-8'>
                    {
                        (studentResponses && typeof studentResponses[0] === 'string') ? studentResponses[0] : "No response"
                    }
                </pre>
            </div>
        )

        // Ensure we have an array of student answers
        const studentAnswers = Array.isArray(studentResponses)
            ? studentResponses
            : studentResponses?.answer || [];

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {question.options.map((option, index) => {
                    const isCorrect = question.answer.includes(option.optionId)
                    const isSelected = Array.isArray(studentAnswers) && studentAnswers.includes(option.optionId)

                    return (
                        <div
                            key={option.optionId}
                            className={`p-4 rounded-lg border ${isCorrect && isSelected
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : isSelected && !isCorrect
                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                    : isCorrect
                                        ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10'
                                        : 'border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                                <LatexPreview content={option.option} />
                                {isCorrect && isSelected && (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                )}
                                {!isCorrect && isSelected && (
                                    <X className="w-4 h-4 text-red-500" />
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    if (!data) return <div className="flex justify-center items-center h-screen">Loading...</div>

    const totalMarks = data.questions.reduce((sum, question) => sum + question.marks, 0)
    const scorePercentage = (data.result.score / totalMarks) * 100

    const isAnswerCorrect = (question: Question, studentResponses: Response) => {
        if (!studentResponses) return false;
        
        const studentAnswers = Array.isArray(studentResponses)
            ? studentResponses
            : studentResponses?.answer || [];

        const correctAnswers = Array.isArray(question.answer)
            ? question.answer
            : [question.answer];

        const sortedStudentAnswers = [...studentAnswers].sort();
        const sortedCorrectAnswers = [...correctAnswers].sort();

        return JSON.stringify(sortedStudentAnswers) === JSON.stringify(sortedCorrectAnswers);
    };

    const filterQuestions = (questions: Question[]) => {
        return questions.filter(q => 
            q.question.toLowerCase().includes(questionSearch.toLowerCase())
        );
    };

    return (
        <div className="container mx-auto py-8 space-y-8">
            <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4" />
                Back
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>Student Result</CardTitle>
                    <CardDescription>Review and edit the student's quiz performance</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Student Details</h3>
                            <p><strong>Name:</strong> {data.result.student.user.name}</p>
                            <p><strong>Roll No:</strong> {data.result.student.user.rollNo.toUpperCase()}</p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Score Overview</h3>
                            <p><strong>Total Score:</strong> {data.result.score} / {totalMarks}</p>
                            <Progress value={scorePercentage} className="mt-2" />
                            <p className="text-sm text-muted-foreground mt-1">{scorePercentage.toFixed(2)}% Correct</p>
                        </div>
                    </div>
                </CardContent>
            </Card>


            <Tabs defaultValue="all" className="w-full">
                <TabsList>
                    <TabsTrigger value="all">All Questions</TabsTrigger>
                    <TabsTrigger value="incorrect">Incorrect Answers</TabsTrigger>
                </TabsList>
                <div className="my-4">
                    <Input
                        placeholder="Search questions..."
                        value={questionSearch}
                        onChange={(e) => setQuestionSearch(e.target.value)}
                        className="max-w-sm"
                    />
                </div>
                <TabsContent value="all">
                    <QuestionList
                        questions={filterQuestions(data.questions)}
                        questionMap={data.questions.reduce((acc, q, i) => ({ ...acc, [q._id]: i + 1 }), {})}
                        responses={responses}
                        editingQuestion={editingQuestion}
                        handleEditQuestion={handleEditQuestion}
                        handleMarkUpdate={handleMarkUpdate}
                        renderOptions={renderOptions}
                        data={data}  // Pass data prop
                    />
                </TabsContent>
                <TabsContent value="incorrect">
                    <QuestionList
                        questions={filterQuestions(data.questions.filter(q => !isAnswerCorrect(q, responses[q._id])))}
                        questionMap={data.questions.reduce((acc, q, i) => ({ ...acc, [q._id]: i + 1 }), {})}
                        responses={responses}
                        editingQuestion={editingQuestion}
                        handleEditQuestion={handleEditQuestion}
                        handleMarkUpdate={handleMarkUpdate}
                        renderOptions={renderOptions}
                        data={data}  // Pass data prop
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function QuestionList({
    questions,
    questionMap,  // Add this prop
    responses,
    editingQuestion,
    handleEditQuestion,
    handleMarkUpdate,
    renderOptions,
    data  // Add data to props
}: {
    questions: Question[]
    questionMap: Record<string, number>  // Add this type
    responses: Record<string, Response>
    editingQuestion: string | null
    handleEditQuestion: (questionId: string) => void
    handleMarkUpdate: (questionId: string, marks: number) => void
    renderOptions: (question: Question, studentAnswer: string) => React.ReactNode
    data: { result: StudentResult; questions: Question[] }  // Add type definition
}) {
    const isQuestionCorrect = (question: Question, response: Response) => {
        if (!response) return false;
        
        const studentAnswers = Array.isArray(response)
            ? response
            : response?.answer || [];

        const correctAnswers = Array.isArray(question.answer)
            ? question.answer
            : [question.answer];

        const sortedStudentAnswers = [...studentAnswers].sort();
        const sortedCorrectAnswers = [...correctAnswers].sort();

        return JSON.stringify(sortedStudentAnswers) === JSON.stringify(sortedCorrectAnswers);
    }

    return (
        <ScrollArea className="rounded-md border p-4">
            <div className="space-y-8">
                {questions.map((question) => (
                    <Card key={question._id} className="relative">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle>Question {questionMap[question._id]}</CardTitle>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant={editingQuestion === question._id ? "default" : "ghost"}
                                        onClick={() => handleEditQuestion(question._id)}
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <strong>Question:</strong>
                                    <p className="mt-2">
                                        <LatexPreview content={question.question} />
                                    </p>
                                </div>

                                {/* Render the options and student responses */}
                                {renderOptions(question, responses[question._id])}

                                {/* Show explanation if available */}
                                {question.explanation && (
                                    <div className="mt-4 pt-4 border-t">
                                        <strong>Explanation:</strong>
                                        <div className="mt-2">
                                            <LatexPreview content={question.explanation} />
                                        </div>
                                    </div>
                                )}

                                {/* Marks section */}
                                <div className="mt-4 pt-4 border-t">
                                    <div className="flex items-center gap-2">
                                        <strong>Marks:</strong>
                                        {editingQuestion === question._id ? (
                                            <Input
                                                type="number"
                                                value={data.result.questionMarks?.[question._id] || 0}
                                                onChange={(e) => handleMarkUpdate(question._id, parseFloat(e.target.value))}
                                                className="w-24"
                                                min={0}
                                                max={question.marks}
                                                onBlur={() => handleEditQuestion(null)}
                                            />
                                        ) : (
                                            <span>{data.result.questionMarks?.[question._id] || 0}</span>
                                        )}
                                        <span>/ {question.marks}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        {!isQuestionCorrect(question, responses[question._id]) && (
                            <div className="absolute top-0 right-0 m-4">
                                <AlertCircle className="w-5 h-5 text-red-500" />
                            </div>
                        )}
                    </Card>
                ))}
                {/* ...existing empty state... */}
            </div>
        </ScrollArea>
    )
}

