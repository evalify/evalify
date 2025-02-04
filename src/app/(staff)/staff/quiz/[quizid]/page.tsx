'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { isValidQuizId } from '@/utils/validation'
import { fetchQuestions, fetchQuizDetails } from './_component/api'
import { Question } from './_component/types'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus } from 'lucide-react'
import { BankSearchDialog } from './_component/bank-search-dialog'
import QuestionsList from '@/components/bank/QuestionsList'
import QuestionForm from '@/components/bank/QuestionForm'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Download, FileDown } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload } from "lucide-react"
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@radix-ui/react-label'

// Update the interfaces to match the API response
interface QuizDetails {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    courses: Array<{
        id: string;
        courseId: string;
        course: {
            id: string;
            code: string;
            class: {
                name: string;
            } | null;
        } | null;
    }>;
}

interface Course {
    id: string;
    name: string;
    code: string;
    semesterId: number;
    class: {
        name: string;
    };
}

const PublishQuizDialog = ({ quizId, onPublish, questions, quizDetails }: {
    quizId: string,
    onPublish: () => void,
    questions: Question[],
    quizDetails: QuizDetails | null
}) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchCourses();
    }, []);

    // Update the useEffect in PublishQuizDialog to safely access course ID
    useEffect(() => {
        if (quizDetails?.courses) {
            setSelectedCourses(quizDetails.courses
                .filter(c => c.id)
                .map(c => c.id)
                .filter(Boolean)
            );
        }
    }, [quizDetails]);

    const fetchCourses = async () => {
        try {
            const response = await fetch('/api/staff/courses');
            const data = await response.json();

            setCourses(data.sort((a: Course, b: Course) => {
                if (a.semesterId !== b.semesterId) {
                    return a.semesterId - b.semesterId;
                }
                return a.class.name.localeCompare(b.class.name);
            }));
        } catch (error) {
            toast.error('Failed to fetch courses');
        }
    };

    // Group courses by semester
    const coursesBySemester = courses.reduce((acc: Record<number, Course[]>, course) => {
        if (!acc[course.semesterId]) {
            acc[course.semesterId] = [];
        }
        acc[course.semesterId].push(course);
        return acc;
    }, {});

    const handlePublish = async () => {
        if (selectedCourses.length === 0) {
            toast.error('Please select at least one course');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/staff/quiz/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quizId,
                    courseIds: selectedCourses
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error);
            }

            toast.success('Quiz published successfully');
            onPublish();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to publish quiz');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="default"
                    disabled={questions.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                >
                    <Upload className="h-4 w-4 mr-2" />
                    Publish Quiz
                </Button>
            </DialogTrigger>
            <DialogContent >
                <DialogHeader>
                    <DialogTitle>Publish Quiz</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm text-gray-500 mb-4">
                        Select the courses to publish this quiz to:
                    </p>
                    <ScrollArea className="h-[400px] rounded-md border p-4">
                        {Object.entries(coursesBySemester).sort(([semA], [semB]) => Number(semA) - Number(semB)).map(([semester, semesterCourses]) => (
                            <div key={semester} className="mb-6">
                                <h3 className="text-md font-semibold mb-2">Semester {semester}</h3>
                                {semesterCourses.map((course) => (
                                    <div key={course.id} className="flex items-center space-x-2 mb-2 ml-4">
                                        <Checkbox
                                            id={course.id}
                                            checked={selectedCourses.includes(course.id)}
                                            onCheckedChange={(checked) => {
                                                setSelectedCourses(prev =>
                                                    checked
                                                        ? [...prev, course.id]
                                                        : prev.filter(id => id !== course.id)
                                                );
                                            }}
                                        />
                                        <Label htmlFor={course.id}>
                                            {course.code} - {course.class.name}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </ScrollArea>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSelectedCourses([])}>
                        Reset
                    </Button>
                    <Button onClick={handlePublish} disabled={isLoading}>
                        {isLoading ? 'Publishing...' : 'Publish'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default function QuizPage() {
    const { quizid } = useParams()
    const [questions, setQuestions] = useState<Question[]>([])
    const [quizDetails, setQuizDetails] = useState<QuizDetails | null>(null)
    const [isAddingQuestion, setIsAddingQuestion] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const router = useRouter()
    useEffect(() => {
        if (!quizid || !isValidQuizId(quizid as string)) {
            toast('Error', {
                description: 'Invalid quiz ID',
            })
            return
        }
        loadQuestions()
        loadQuizDetails()
    }, [quizid])

    const loadQuizDetails = async () => {
        try {
            const details = await fetchQuizDetails(quizid as string);
            setQuizDetails(details);
        } catch (error) {
            console.log('Failed to fetch quiz details:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to fetch quiz details');
            router.push('/staff/quiz');
        }
    };

    const loadQuestions = async () => {
        try {
            const fetchedQuestions = await fetchQuestions(quizid as string)
            setQuestions(fetchedQuestions)
        } catch (error) {
            toast('Error', {
                description: error instanceof Error ? error.message : 'Failed to fetch questions',
            })
        }
    }

    const handleSave = async (questionData: Question) => {
        try {
            const response = await fetch('/api/staff/quiz/questions', {
                method: questionData._id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...questionData,
                    quizId: quizid,
                    _id: questionData._id || questionData.id,
                    question: questionData.question,
                    mark: parseInt(questionData.mark?.toString() || '1')
                })
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.message || 'Failed to update question');
                return;
            }
            toast.success('Question updated successfully');
            await loadQuestions();
            setIsAddingQuestion(false);
            setEditingQuestion(null);
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Failed to save question');
        }
    };

    const handleDelete = async (questionId: string) => {
        try {
            const response = await fetch(`/api/staff/quiz/questions`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quizId: quizid,
                    questionId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data?.message || data?.error || 'Failed to delete question');
                return;
            }

            toast.success('Question deleted successfully');
            await loadQuestions(); // Reload the questions after successful deletion
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete question');
        }
    };

    const handleQuestionsFromBank = async (bankQuestions: Question[]) => {
        try {
            const response = await fetch('/api/staff/quiz/questions/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quizId: quizid,
                    questions: bankQuestions.map(({ _id, id, ...q }) => ({
                        ...q,
                        bankId: q.bankId,
                    }))
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to add questions');
            }

            toast.success(`Added ${bankQuestions.length} questions to quiz`);
            loadQuestions(); // Reload questions after adding
        } catch (error) {
            toast.error('Failed to add questions from bank');
        }
    };

    const handleEdit = (question: Question) => {
        // Transform the question data to match the form expectations
        const transformedQuestion = {
            ...question,
            id: question._id || question.id,
            question: question.question || question.content,
            topics: question.topics || [],
            options: question.options || [],
            answer: question.answer || [],
            expectedAnswer: question.expectedAnswer || '',
            mark: question.mark || 1,
            difficulty: question.difficulty || 'MEDIUM',
            type: question.type || 'MCQ'
        };
        setEditingQuestion(transformedQuestion);
        setIsAddingQuestion(true);
    };

    const handleDownload = async (format: 'pdf-with-answers' | 'pdf-without-answers' | 'excel') => {
        try {
            const response = await fetch(`/api/staff/quiz/${quizid}/download?format=${format}`, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quiz-${quizid}-${format}.${format.includes('pdf') ? 'pdf' : 'xlsx'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error('Failed to download quiz');
        }
    };

    if (!quizid || !isValidQuizId(quizid as string)) {
        return (
            <div className="p-4">
                <h1>Invalid Quiz ID</h1>
                <p>Please check the URL and try again.</p>
            </div>
        )
    }

    return (
        <div className="p-4 space-y-6">
            <div className='flex flex-col gap-4'>
                <div className='flex justify-between'>
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft />
                        Back
                    </Button>

                    <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        <FileDown className="h-4 w-4 mr-2" />
                                        Download
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleDownload('pdf-with-answers')}>
                                        <Download className="h-4 w-4 mr-2" />
                                        PDF with Answers
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDownload('pdf-without-answers')}>
                                        <Download className="h-4 w-4 mr-2" />
                                        PDF without Answers
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDownload('excel')}>
                                        <Download className="h-4 w-4 mr-2" />
                                        Excel Format
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button onClick={() => setIsAddingQuestion(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Question
                            </Button>
                            <BankSearchDialog
                                onQuestionsAdd={handleQuestionsFromBank}
                                existingQuestions={questions}
                                quizId={quizid as string}
                            />
                            <PublishQuizDialog
                                quizId={quizid as string}
                                onPublish={loadQuizDetails}
                                questions={questions}
                                quizDetails={quizDetails}
                            />
                            <Button onClick={() => router.push(`/staff/quiz/result/${quizid}`)}
                                disabled={questions.length === 0}>
                                View Results
                            </Button>
                        </div>
                    </div>
                </div>

                {quizDetails && (
                    <div className=" rounded-lg p-6 shadow-sm border">
                        <h1 className="text-2xl font-bold mb-4">{quizDetails.title}</h1>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Questions</p>
                                <p className="text-lg font-semibold">{questions.length}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Marks</p>
                                <p className="text-lg font-semibold">{(questions.reduce((sum, question) => { return sum + question.mark }, 0))}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Start Time</p>
                                <p className="text-lg font-semibold">
                                    {new Date(quizDetails.startTime).toLocaleDateString('en-US', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">End Time</p>
                                <p className="text-lg font-semibold">
                                    {new Date(quizDetails.endTime).toLocaleDateString('en-US', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Classes</p>
                                <p className="text-lg font-semibold">
                                    {quizDetails.courses?.length > 0
                                        ? quizDetails.courses
                                            .map(c => c.class.name)
                                            .join(', ')
                                        : "No Course"
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                )}



                <div className='flex flex-col gap-4'>
                    <QuestionsList
                        questions={questions}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onQuestionUpdate={loadQuestions}
                        requireTopics={false}
                        bankId=""
                        topic={[]}
                    />

                </div>

                <Sheet
                    open={isAddingQuestion}
                    onOpenChange={(open) => {
                        if (!open) {
                            setIsAddingQuestion(false);
                            setEditingQuestion(null);
                        }
                    }}
                >
                    <SheetContent
                        side="right"
                        className="w-[1200px] sm:max-w-[1200px] overflow-y-auto"
                    >
                        <SheetHeader>
                            <SheetTitle>
                                {editingQuestion ? "Edit Question" : "Add New Question"}
                            </SheetTitle>
                        </SheetHeader>
                        <QuestionForm
                            onCancel={() => {
                                setIsAddingQuestion(false);
                                setEditingQuestion(null);
                            }}
                            onSave={handleSave}
                            editingQuestion={editingQuestion}
                            requireTopics={false}
                            topics={[]}
                            bankId=""
                            quizId={quizid as string}
                        />
                    </SheetContent>
                </Sheet>
            </div>
        </div>
    );
}

