'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle, X, Award, FileDown, AlertCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import TiptapRenderer from '@/components/ui/tiptap-renderer'
import { QuizResultSummary } from '@/components/quiz-result-summary'
import ReactMarkdown from 'react-markdown'
import * as XLSX from 'xlsx'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

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

    // New function to download detailed quiz report
    const downloadDetailedReport = () => {
        if (!data) return;
        
        try {
            const { result, questions } = data;
            const { responses } = result;
            
            // Basic quiz information
            const quizInfo = {
                "Quiz Title": result.quiz.title,
                "Date Taken": new Date(result.startTime).toLocaleDateString(),
                "Time Started": new Date(result.startTime).toLocaleTimeString(),
                "Time Submitted": result.submittedAt ? new Date(result.submittedAt).toLocaleTimeString() : "N/A",
                "Total Score": `${result.score} / ${result.totalScore}`,
                "Percentage": `${((result.score / result.totalScore) * 100).toFixed(2)}%`,
            };
            
            // Question-wise breakdown
            const questionDetails = questions.map((question, index) => {
                const response = responses ? responses[question._id] : null;
                const isNotAttempted = !response || !response.student_answer?.length ||
                    (Array.isArray(response.student_answer) && response.student_answer.every(ans => !ans));
                
                let studentAnswer = "Not attempted";
                if (!isNotAttempted) {
                    if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
                        // Get option texts for selected answers
                        studentAnswer = question.options
                            .filter(opt => response.student_answer.includes(opt.optionId))
                            .map(opt => opt.option.replace(/<[^>]*>/g, ''))
                            .join(", ");
                    } else {
                        studentAnswer = Array.isArray(response.student_answer) 
                            ? response.student_answer[0]?.replace(/<[^>]*>/g, '') || "No response" 
                            : response.student_answer?.replace(/<[^>]*>/g, '') || "No response";
                    }
                }
                
                // Clean HTML tags from correct answers
                let correctAnswer = "";
                if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
                    correctAnswer = question.options
                        .filter(opt => question.answer.includes(opt.optionId))
                        .map(opt => opt.option.replace(/<[^>]*>/g, ''))
                        .join(", ");
                } else if (question.expectedAnswer) {
                    correctAnswer = question.expectedAnswer.replace(/<[^>]*>/g, '');
                } else {
                    correctAnswer = "Not provided";
                }
                
                return {
                    "Question Number": index + 1,
                    "Question": question.question.replace(/<[^>]*>/g, ''),
                    "Type": question.type,
                    "Your Answer": studentAnswer,
                    "Correct Answer": correctAnswer,
                    "Points Earned": isNotAttempted ? 0 : (response.score || 0),
                    "Max Points": question.mark || 0,
                    "Feedback": response?.remarks || "No feedback provided"
                };
            });
            
            // Create workbook and add sheets
            const workbook = XLSX.utils.book_new();
            
            // Add quiz summary sheet
            const summaryData = [
                ["Quiz Result Summary"],
                [""],
                ["Student Name", result.student?.user?.name || ""],
                ["Roll Number", result.student?.user?.rollNo || ""],
                ["Email", result.student?.user?.email || ""],
                [""],
                ["Quiz Information"],
                ["Quiz Title", result.quiz.title],
                ["Date Taken", new Date(result.startTime).toLocaleDateString()],
                ["Time Started", new Date(result.startTime).toLocaleTimeString()],
                ["Time Submitted", result.submittedAt ? new Date(result.submittedAt).toLocaleTimeString() : "N/A"],
                [""],
                ["Performance"],
                ["Total Score", `${result.score} / ${result.totalScore}`],
                ["Percentage", `${((result.score / result.totalScore) * 100).toFixed(2)}%`],
            ];
            
            const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(workbook, summaryWs, "Summary");
            
            // Add detailed questions sheet
            const questionsWs = XLSX.utils.json_to_sheet(questionDetails);
            XLSX.utils.book_append_sheet(workbook, questionsWs, "Question Details");
            
            // Set column widths for questions sheet
            const questionColWidths = [
                { wch: 10 }, // Question Number
                { wch: 40 }, // Question
                { wch: 15 }, // Type
                { wch: 30 }, // Your Answer
                { wch: 30 }, // Correct Answer
                { wch: 12 }, // Points Earned
                { wch: 10 }, // Max Points
                { wch: 40 }, // Feedback
            ];
            
            questionsWs['!cols'] = questionColWidths;
            
            // Generate Excel file and download
            XLSX.writeFile(workbook, `${result.quiz.title.replace(/\s+/g, '_')}_Result.xlsx`);
            toast.success("Detailed quiz report downloaded successfully");
        } catch (error) {
            console.error("Error generating detailed report:", error);
            toast.error("Failed to download detailed report");
        }
    };

    if (!data) return <div className="flex justify-center items-center h-screen">Loading...</div>

    const { result, questions } = data
    const { responses } = result

    const totalMarks = questions.reduce((sum: number, q: any) => sum + (q.mark || 0), 0)
    const scorePercentage = (result.score / totalMarks) * 100

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Quizzes
                </Button>
                
                {/* Export dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                            <FileDown className="h-4 w-4" />
                            <span>Export Result</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={downloadDetailedReport} className="cursor-pointer">
                            <FileDown className="mr-2 h-4 w-4" />
                            <span>Download Detailed Report</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <div className="p-2 text-xs text-muted-foreground">
                            Export your result as Excel worksheet
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

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
                            <QuizResultSummary questions={questions} responses={responses} />
                            <Separator className="my-4" />
                            <div className="space-y-6">
                                {questions.map((question, index) => (
                                    <QuestionResult
                                        key={question._id}
                                        question={question}
                                        response={responses[question._id]}
                                        index={index}
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

function QuestionResult({ question, response, index }: {
    question: any,
    response: any,
    index: number
}) {
    const isNotAttempted = !response || !response.student_answer?.length ||
        (Array.isArray(response.student_answer) && response.student_answer.every(ans => !ans));

    if (isNotAttempted) {
        return (
            <div className="space-y-4 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                    <h3 className="font-medium">Question {index + 1}</h3>
                    <Badge variant="secondary">Not Attempted</Badge>
                </div>

                <div className="pl-4 border-l-2 border-muted">
                    <TiptapRenderer content={question.question} />
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-100 rounded-lg p-4 dark:bg-slate-900">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <AlertCircle className="w-4 h-4" />
                            <span>You did not attempt this question</span>
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
                                            <TiptapRenderer content={option.option} />
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
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4 rounded-lg border">
            <div className="flex items-center justify-between">
                <h3 className="font-medium">Question {index + 1}</h3>
                {isNotAttempted ? (
                    <Badge variant="secondary">Not Attempted</Badge>
                ) : (
                    <Badge variant={response?.score > 0 ? "success" : "destructive"}>
                        {response?.score || response?.negative_score || 0} / {question.mark} marks
                    </Badge>
                )}
            </div>

            <div className="pl-4 border-l-2 border-muted">
                <TiptapRenderer content={question.question} />
            </div>

            {isNotAttempted ? (
                <div className="bg-slate-100 rounded-lg p-4 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <AlertCircle className="w-4 h-4" />
                        <span>Question not attempted</span>
                    </div>
                </div>
            ) : (
                renderResponse()
            )}

            {question.explanation && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="font-medium mb-2">Explanation:</p>
                    <TiptapRenderer content={question.explanation} />
                </div>
            )}
        </div>
    );

    function renderResponse() {
        if (!response) return null;

        switch (question.type) {
            case 'MCQ':
            case 'TRUE_FALSE':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {question.options.map((option: any, optIndex: number) => {
                            const isCorrect = question.answer.includes(option.optionId);
                            const isSelected = response.student_answer.includes(option.optionId);

                            return (
                                <div
                                    key={option.optionId}
                                    className={`p-4 rounded-lg border ${isCorrect && isSelected ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                                        isSelected && !isCorrect ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                                            isCorrect ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10' :
                                                'border-gray-200 dark:border-gray-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span>
                                        <TiptapRenderer content={option.option} />
                                        {isCorrect && isSelected && <CheckCircle className="w-4 h-4 text-green-500" />}
                                        {!isCorrect && isSelected && <X className="w-4 h-4 text-red-500" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );

            case 'FILL_IN_BLANK':
            case 'DESCRIPTIVE':
                return (
                    <div className="space-y-4">
                        <div className="bg-slate-100 rounded-lg p-4 dark:bg-slate-900">
                            <div className="font-medium mb-2">Your Answer:</div>
                            <TiptapRenderer content={response.student_answer[0] || "No response"} />
                        </div>
                        {response.remarks && (
                            <div className="bg-blue-50 rounded-lg p-4 dark:bg-blue-900/20">
                                <div className="font-medium mb-2">Feedback:</div>
                                <div>{response.remarks}</div>
                            </div>
                        )}
                        {question.expectedAnswer && (
                            <div className="bg-green-50 rounded-lg p-4 dark:bg-green-900/20">
                                <div className="font-medium mb-2">Expected Answer:</div>
                                <TiptapRenderer content={question.expectedAnswer} />
                            </div>
                        )}
                        {response.breakdown && (
                            <div className="bg-green-50 rounded-lg p-4 dark:bg-green-900/20">
                                <div className="font-medium mb-2">Mark Breakdown:</div>
                                <div className="prose dark:prose-invert prose-sm max-w-none">
                                    <ReactMarkdown>{response.breakdown}</ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'CODING':
                return (
                    <div className="space-y-4">
                        <div className="bg-slate-100 rounded-lg p-4 dark:bg-slate-900">
                            <div className="font-medium mb-2">Your Code:</div>
                            <pre className="overflow-x-auto">
                                {response.student_answer[0] || "No code submitted"}
                            </pre>
                        </div>
                        {response.remarks && (
                            <div className="bg-blue-50 rounded-lg p-4 dark:bg-blue-900/20">
                                <div className="font-medium mb-2">Feedback:</div>
                                <div>{response.remarks}</div>
                            </div>
                        )}
                    </div>
                );

            case 'FILE_UPLOAD':
                return (
                    <div className="bg-slate-100 rounded-lg p-4 dark:bg-slate-900">
                        <div className="font-medium mb-2">Your Submission:</div>
                        {response.student_answer[0] ? (
                            <a
                                href={response.student_answer[0]}
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
                );

            default:
                return null;
        }
    }
}