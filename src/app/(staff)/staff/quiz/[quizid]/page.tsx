'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { isValidQuizId } from '@/utils/validation'
import { fetchQuestions } from './_component/api'
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

export default function QuizPage() {
    const { quizid } = useParams()
    const [questions, setQuestions] = useState<Question[]>([])
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
    }, [quizid])

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
                    question: questionData.content || questionData.question, // Ensure question content is properly mapped
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
            content: question.question || question.content,
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
            <div className='flex justify-between'>

                <div className="flex gap-5 items-center">
                    <Button variant="ghost" onClick={() => {
                        router.back()
                    }}>
                        <ArrowLeft />
                        Back
                    </Button>
                    <h1 className="text-2xl font-bold">Quiz Questions</h1>
                </div>

                <div className="flex gap-2">
                    <Button onClick={() => setIsAddingQuestion(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                    </Button>
                    <BankSearchDialog 
                        onQuestionsAdd={handleQuestionsFromBank} 
                        existingQuestions={questions} // Add this prop
                        quizId={quizid as string} // Add quizId prop
                    />
                </div>
            </div>

            <div className='flex flex-col gap-4'>
                <QuestionsList
                    questions={questions}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onQuestionUpdate={loadQuestions}
                    requireTopics={false}
                    bankId="" // Add empty bankId
                    topic={[]} // Add empty topic array
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
    );
}

