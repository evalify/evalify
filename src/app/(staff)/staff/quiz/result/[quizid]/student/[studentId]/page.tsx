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
import TiptapRenderer from '@/components/ui/tiptap-renderer'
import { QuizResultSummary } from '@/components/quiz-result-summary'

type Option = {
    option: string;
    optionId: string;
    image?: string;
}

type Question = {
    _id: string;
    question: string;
    options: Option[];
    answer: string[];
    mark: number;
    type: string;
    explanation?: string;
}

type Response = {
    negative_score: number;
    score: number;
    student_answer: string[];
    remarks?: string;
    breakdown?: string;
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

    const handleMarkUpdate = async (questionId: string, score: number, remarks?: string, breakdown?: string) => {
        try {
            const response = await fetch(`/api/staff/result/${studentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionId,
                    score,
                    remarks,
                    breakdown
                })
            });

            if (response.ok) {
                toast.success('Marks updated successfully');
                fetchData(); // Refresh data
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

    const renderOptions = (question: Question, studentResponse: Response) => {
        const isNotAttempted = !studentResponse || !studentResponse.student_answer?.length || 
            (Array.isArray(studentResponse.student_answer) && studentResponse.student_answer.every(ans => !ans));

        if (isNotAttempted) {
            return (
                <div className="mt-4 space-y-4">
                    <div className="bg-slate-100 rounded-lg p-4 dark:bg-slate-900">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <AlertCircle className="w-4 h-4" />
                            <span>Student did not attempt this question</span>
                        </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 dark:bg-green-900/20">
                        <div className="font-medium mb-2">Correct Answer:</div>
                        {question.type === 'MCQ' || question.type === 'TRUE_FALSE' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {question.options
                                    .filter(opt => question.answer.includes(opt.optionId))
                                    .map((option, index) => (
                                        <div key={option.optionId} className="flex items-center gap-2">
                                            <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                                            <LatexPreview content={option.option} />
                                        </div>
                                    ))
                                }
                            </div>
                        ) : question.type === 'FILL_IN_BLANK' || question.type === 'DESCRIPTIVE' ? (
                            <div>
                                {question.expectedAnswer ? (
                                    <TiptapRenderer content={question.expectedAnswer} />
                                ) : (
                                    <span className="text-muted-foreground">No expected answer provided</span>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            );
        }

        switch (question.type) {
            case 'MCQ':
            case 'TRUE_FALSE':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        {question.options.map((option, index) => {
                            const isCorrect = question.answer.includes(option.optionId);
                            const isSelected = studentResponse.student_answer.includes(option.optionId);

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
                            );
                        })}
                    </div>
                );

            case 'FILL_IN_BLANK':
            case 'DESCRIPTIVE':
                return (
                    <div className="mt-4 space-y-4">
                        <div className="bg-slate-100 rounded-lg p-4 dark:bg-slate-900">
                            <div className="font-medium mb-2">Student's Answer:</div>
                            <div className="whitespace-pre-wrap">
                                <TiptapRenderer content={studentResponse.student_answer[0] || "No response"} />
                            </div>
                        </div>

                        {editingQuestion === question._id ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Remarks</label>
                                    <textarea
                                        className="w-full p-2 border rounded-md"
                                        value={studentResponse.remarks || ''}
                                        onChange={(e) => {
                                            const updatedResponse = {
                                                ...studentResponse,
                                                remarks: e.target.value
                                            };
                                            handleMarkUpdate(
                                                question._id,
                                                studentResponse.score || 0,
                                                e.target.value,
                                                studentResponse.breakdown
                                            );
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Mark Breakdown</label>
                                    <textarea
                                        className="w-full p-2 border rounded-md"
                                        value={studentResponse.breakdown || ''}
                                        onChange={(e) => {
                                            const updatedResponse = {
                                                ...studentResponse,
                                                breakdown: e.target.value
                                            };
                                            handleMarkUpdate(
                                                question._id,
                                                studentResponse.score || 0,
                                                studentResponse.remarks,
                                                e.target.value
                                            );
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                {studentResponse.remarks && (
                                    <div className="bg-blue-50 rounded-lg p-4 dark:bg-blue-900/20">
                                        <div className="font-medium mb-2">Remarks:</div>
                                        <div>{studentResponse.remarks}</div>
                                    </div>
                                )}
                                {studentResponse.breakdown && (
                                    <div className="bg-green-50 rounded-lg p-4 dark:bg-green-900/20">
                                        <div className="font-medium mb-2">Mark Breakdown:</div>
                                        <div>{studentResponse.breakdown}</div>
                                    </div>
                                )}
                            </>
                        )}

                        {question.expectedAnswer && (
                            <div className="bg-green-50 rounded-lg p-4 dark:bg-green-900/20">
                                <div className="font-medium mb-2">Expected Answer:</div>
                                <div>
                                    <TiptapRenderer content={question.expectedAnswer} />
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'CODING':
                return (
                    <div className="mt-4 space-y-4">
                        <div className="bg-slate-100 rounded-lg p-4 dark:bg-slate-900">
                            <div className="font-medium mb-2">Student's Code:</div>
                            <pre className="overflow-x-auto">
                                {studentResponse.student_answer[0] || "No code submitted"}
                            </pre>
                        </div>
                        {question.testCases && (
                            <div className="bg-slate-50 rounded-lg p-4 dark:bg-slate-800">
                                <div className="font-medium mb-2">Test Cases:</div>
                                {question.testCases.map((testCase, idx) => (
                                    <div key={idx} className="mb-2 p-2 border rounded">
                                        <div>Input: {testCase.input}</div>
                                        <div>Expected Output: {testCase.output}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 'FILE_UPLOAD':
                return (
                    <div className="mt-4">
                        <div className="bg-slate-100 rounded-lg p-4 dark:bg-slate-900">
                            <div className="font-medium mb-2">Submitted File:</div>
                            {studentResponse.student_answer[0] ? (
                                <a
                                    href={studentResponse.student_answer[0]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline inline-flex items-center"
                                >
                                    <FileDown className="h-4 w-4 mr-2" />
                                    Download Submitted File
                                </a>
                            ) : (
                                "No file submitted"
                            )}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    if (!data) return <div className="flex justify-center items-center h-screen">Loading...</div>

    const totalMarks = data.questions.reduce((sum, question) => sum + question.mark, 0)
    const scorePercentage = (data.result.score / totalMarks) * 100

    const isAnswerCorrect = (question: Question, response: Response) => {
        if (!response || !response.student_answer) return false;

        if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
            // Ensure student_answer is an array before spreading
            const studentAnswerArray = Array.isArray(response.student_answer) ? response.student_answer : [];
            const sortedStudentAnswers = [...studentAnswerArray].sort();
            const sortedCorrectAnswers = [...question.answer].sort();
            return JSON.stringify(sortedStudentAnswers) === JSON.stringify(sortedCorrectAnswers);
        }

        return response.score === question.marks;
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

            <QuizResultSummary questions={data.questions} responses={data.result.responses} />

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
                        data={data}
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
                        data={data}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function QuestionList({
    questions,
    questionMap,
    responses,
    editingQuestion,
    handleEditQuestion,
    handleMarkUpdate,
    renderOptions,
    data
}: {
    questions: Question[]
    questionMap: Record<string, number>
    responses: Record<string, Response>
    editingQuestion: string | null
    handleEditQuestion: (questionId: string) => void
    handleMarkUpdate: (questionId: string, marks: number) => void
    renderOptions: (question: Question, studentAnswer: string) => React.ReactNode
    data: { result: StudentResult; questions: Question[] }
}) {

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
                                    <div className="mt-2">
                                        <TiptapRenderer content={question.question} />
                                    </div>
                                </div>

                                {/* Render the options and student responses */}
                                {renderOptions(question, responses[question._id])}

                                {/* Show explanation if available */}
                                {question.explanation && (
                                    <div className="mt-4 pt-4 border-t">
                                        <strong>Explanation:</strong>
                                        <div className="mt-2">
                                            <TiptapRenderer content={question.explanation} />
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
                                                value={responses[question._id]?.score || responses[question._id]?.negative_score || 0}
                                                onChange={(e) => handleMarkUpdate(question._id, parseFloat(e.target.value))}
                                                className="w-24"
                                                max={question.mark}
                                                onBlur={() => handleEditQuestion(null)}
                                                disabled={!responses[question._id] || !responses[question._id].student_answer?.length}
                                            />
                                        ) : (
                                            <span>{responses[question._id]?.score || responses[question._id]?.negative_score || 0}</span>
                                        )}
                                        <span>/ {question.mark}</span>
                                        {(!responses[question._id] || !responses[question._id].student_answer?.length) && (
                                            <span className="text-muted-foreground text-sm">(Not attempted)</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>

                    </Card>
                ))}
            </div>
        </ScrollArea>
    )
}

