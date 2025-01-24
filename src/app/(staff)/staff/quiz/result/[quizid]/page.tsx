'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
import { Input } from '@/components/ui/input'
import { ChevronUp, ChevronDown, ChevronsUpDown, ArrowLeft } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ReloadIcon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import * as XLSX from 'xlsx'
import { Download } from 'lucide-react'


export default function QuizPage() {
    const { quizid } = useParams()
    const [quiz, setQuiz] = useState<any>()
    const [questions, setQuestions] = useState<any>([])
    const [quizResults, setQuizResults] = useState<any>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [sortConfig, setSortConfig] = useState<{
        key: string;
        direction: 'asc' | 'desc' | null;
    }>({ key: '', direction: null })
    const [isEvaluating, setIsEvaluating] = useState(false)
    const [chartVisibility, setChartVisibility] = useState({
        performance: true,
        questionAnalysis: true,
        markDistribution: true
    });

    const toggleChart = (chartName: keyof typeof chartVisibility) => {
        setChartVisibility(prev => ({
            ...prev,
            [chartName]: !prev[chartName]
        }));
    };

    const router = useRouter()

    const getQuizData = async (quizId: string) => {
        try {
            const response = await fetch(`/api/staff/result?quizid=${quizId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            const data = await response.json()
            if (response.ok) {
                setQuiz(data.quiz)
                setQuestions(data.questions)
                setQuizResults(data.quizResults)
            } else {
                toast('Error', {
                    description: data.error || 'Failed to fetch quiz data',
                })
            }
        } catch (error) {
            toast('Error', {
                description: error instanceof Error ? error.message : 'Failed to fetch quiz data',
            })
        }
    }

    useEffect(() => {
        if (!quizid) {
            toast('Error', {
                description: 'Invalid quiz ID',
            })
            return
        }
        getQuizData(quizid)
    }, [quizid])

    if (!quizid) {
        return (
            <div className="p-4">
                <h1>Invalid Quiz ID</h1>
                <p>Please check the URL and try again.</p>
            </div>
        )
    }

    // Calculate statistics
    const calculateStats = () => {
        if (!quizResults.length) return null
        const scores = quizResults.map((result: any) => result.score)
        return {
            average: scores.reduce((a: number, b: number) => a + b, 0) / scores.length,
            highest: Math.max(...scores),
            lowest: Math.min(...scores),
            total: quizResults.length
        }
    }

    const stats = calculateStats()

    // Prepare chart data
    const chartData = quizResults.map((result: any) => ({
        name: result.student.user.name,
        score: result.score
    })).sort((a: any, b: any) => a.score - b.score)

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' | null = 'asc'

        if (sortConfig.key === key) {
            if (sortConfig.direction === 'asc') direction = 'desc'
            else if (sortConfig.direction === 'desc') direction = null
        }

        setSortConfig({ key, direction })
    }

    const getSortIcon = (columnKey: string) => {
        if (sortConfig.key !== columnKey) return <ChevronsUpDown className="w-4 h-4" />
        if (sortConfig.direction === 'asc') return <ChevronUp className="w-4 h-4" />
        if (sortConfig.direction === 'desc') return <ChevronDown className="w-4 h-4" />
        return <ChevronsUpDown className="w-4 h-4" />
    }

    const sortAndFilterResults = () => {
        let filtered = [...quizResults]

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(result =>
                result.student.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                result.student.user.rollNo?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        // Apply sorting
        if (sortConfig.key && sortConfig.direction) {
            filtered.sort((a, b) => {
                let aValue, bValue

                switch (sortConfig.key) {
                    case 'name':
                        aValue = a.student.user.name
                        bValue = b.student.user.name
                        break
                    case 'rollNo':
                        aValue = a.student.user.rollNo
                        bValue = b.student.user.rollNo
                        break
                    case 'score':
                        aValue = a.score
                        bValue = b.score
                        break
                    case 'violations':
                        aValue = (a.violations?.split("\n").length || 0) - 1
                        bValue = (b.violations?.split("\n").length || 0) - 1
                        break
                    case 'submittedAt':
                        aValue = new Date(a.submittedAt).getTime()
                        bValue = new Date(b.submittedAt).getTime()
                        break
                    default:
                        return 0
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
                return 0
            })
        }

        return filtered
    }

    const evaluateAllResponses = async () => {
        setIsEvaluating(true)
        try {
            const response = await fetch(`/api/staff/result`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quizId: quizid })
            })

            const data = await response.json()
            if (response.ok) {
                toast.success('All responses evaluated successfully')
                getQuizData(quizid)
            } else {
                toast.error(data.error || 'Failed to evaluate responses')
            }
        } catch (error) {
            toast.error('Failed to evaluate responses')
        } finally {
            setIsEvaluating(false)
        }
    }

    const downloadExcel = () => {
        const sortedResults = [...quizResults].sort((a, b) =>
            (a.student.user.rollNo || '').localeCompare(b.student.user.rollNo || '')
        );

        const worksheet = XLSX.utils.json_to_sheet(
            sortedResults.map(result => ({
                'Roll No': (result.student.user.rollNo || '').toUpperCase(),
                'Name': result.student.user.name,
                'Score': result.score,
                'Total Marks': questions.reduce((sum: number, q: any) => sum + q.marks, 0),
                'Percentage': ((result.score / questions.reduce((sum: number, q: any) => sum + q.marks, 0)) * 100).toFixed(2) + '%'
            }))
        );

        const colWidths = [
            { wch: 15 }, // Roll No
            { wch: 30 }, // Name
            { wch: 10 }, // Score
            { wch: 15 }, // Total Marks
            { wch: 12 }, // Percentage
        ];
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

        // Generate filename with quiz title and date
        const filename = `${quiz?.title || 'Quiz'}_Results_${new Date().toLocaleDateString()}.xlsx`;
        XLSX.writeFile(workbook, filename);
    };

    // Add function to prepare question stats data
    const prepareQuestionStatsData = () => {
        if (!quiz?.QuizReport?.[0]?.questionStats) return [];
        const stats = quiz.QuizReport[0].questionStats as any[];

        return Object.values(stats).map((stat: any, index) => ({
            question: `Q${index + 1}`,
            correct: stat.correct || 0,
            incorrect: stat.incorrect || 0,
            avgMarks: stat.avgMarks || 0,
            maxMarks: stat.maxMarks || 0
        }));
    };

    // Add function to prepare mark distribution data
    const prepareMarkDistributionData = () => {
        if (!quiz?.QuizReport?.[0]?.markDistribution) return [];
        const dist = quiz.QuizReport[0].markDistribution as any;
        return [
            { name: 'Excellent (80-100%)', value: dist.excellent || 0, color: '#4ade80' },
            { name: 'Good (60-79%)', value: dist.good || 0, color: '#3b82f6' },
            { name: 'Average (40-59%)', value: dist.average || 0, color: '#f59e0b' },
            { name: 'Poor (0-39%)', value: dist.poor || 0, color: '#ef4444' }
        ].filter(item => item.value > 0); // Only show categories with values
    };


    return (
        <div className="p-6 space-y-6">
            <div>
                <Button variant="ghost" onClick={() => router.push('/staff/quiz')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Quizzes
                </Button>
            </div>
            {quiz && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Quiz Title</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{quiz.title}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.average.toFixed(2) || 'N/A'}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.highest || 'N/A'}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.total || 0}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="flex justify-end gap-4">
                <Button
                    variant="outline"
                    onClick={downloadExcel}
                    className="flex items-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    Download Report
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="default" disabled={isEvaluating}>
                            {isEvaluating ? (
                                <>
                                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                                    Evaluating...
                                </>
                            ) : (
                                'Evaluate All Responses'
                            )}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Evaluate All Responses?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will recalculate scores for all submissions based on the correct answers.
                                Existing manual evaluations will be overwritten.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={evaluateAllResponses}>
                                Continue
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            <Card className="mt-6 dark:bg-gray-900">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Performance Distribution</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => toggleChart('performance')}>
                            {chartVisibility.performance ? 'Hide' : 'Show'} Chart
                        </Button>
                    </div>
                </CardHeader>
                {chartVisibility.performance && (
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                <XAxis dataKey="name" stroke="#ccc" tick={{ fill: "#ccc" }} />
                                <YAxis stroke="#ccc" tick={{ fill: "#ccc" }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "#333", borderColor: "#444", color: "#fff" }}
                                    itemStyle={{ color: "#fff" }}
                                    labelStyle={{ color: "#fff" }}
                                />
                                <Bar dataKey="score" fill="#4f46e5" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                )}
            </Card>

            <Card className="mt-6 dark:bg-gray-900">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Question-wise Analysis</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => toggleChart('questionAnalysis')}>
                            {chartVisibility.questionAnalysis ? 'Hide' : 'Show'} Chart
                        </Button>
                    </div>
                </CardHeader>
                {chartVisibility.questionAnalysis && (
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={prepareQuestionStatsData()}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                <XAxis dataKey="question" stroke="#ccc" />
                                <YAxis stroke="#ccc" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "#333", borderColor: "#444" }}
                                    itemStyle={{ color: "#fff" }}
                                    labelStyle={{ color: "#fff" }}
                                />
                                <Legend />
                                <Bar dataKey="correct" fill="#4ade80" name="Correct" />
                                <Bar dataKey="incorrect" fill="#f87171" name="Incorrect" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                )}
            </Card>

            <Card className="mt-6 dark:bg-gray-900">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Mark Distribution</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => toggleChart('markDistribution')}>
                            {chartVisibility.markDistribution ? 'Hide' : 'Show'} Chart
                        </Button>
                    </div>
                </CardHeader>
                {chartVisibility.markDistribution && (
                    <CardContent className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={prepareMarkDistributionData()}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={120}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {prepareMarkDistributionData().map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                )}
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Student Results</span>
                        <Input
                            placeholder="Search by name or roll number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-xs"
                        />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead onClick={() => handleSort('name')} className="cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center gap-2">
                                        Name {getSortIcon('name')}
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort('rollNo')} className="cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center gap-2">
                                        Roll No {getSortIcon('rollNo')}
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort('score')} className="cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center gap-2">
                                        Score {getSortIcon('score')}
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort('violations')} className="cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center gap-2">
                                        Violations {getSortIcon('violations')}
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort('submittedAt')} className="cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center gap-2">
                                        Submitted At {getSortIcon('submittedAt')}
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort('ip')} className="cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center gap-2">
                                        IP Address {getSortIcon('ip')}
                                    </div>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {
                                sortAndFilterResults().map((result: any) => (
                                    <TableRow
                                        key={result.id}
                                        className="cursor-pointer "
                                        onClick={() => router.push(`/staff/quiz/result/${quizid}/student/${result.id}`)}
                                    >
                                        <TableCell>{result.student.user.name}</TableCell>
                                        <TableCell>{(result.student.user.rollNo as string).toUpperCase()}</TableCell>
                                        <TableCell>{result.score}</TableCell>
                                        <TableCell>{result.violations ? result.violations.split("\n").length - 1 : 0}</TableCell>
                                        <TableCell>{new Date(result.submittedAt).toLocaleString()}</TableCell>
                                        <TableCell className={!result.ip?.startsWith('172') ? 'text-red-500 font-medium' : ''}>
                                            {result.ip || 'N/A'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            }
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}

