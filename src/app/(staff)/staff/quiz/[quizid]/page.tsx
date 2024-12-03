'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { isValidQuizId } from '@/utils/validation'
import { MCQCard } from './_component/mcq-card'
import { fetchQuestions, createQuestion, updateQuestion, deleteQuestion } from './_component/api'
import { Question } from './_component/types'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus } from 'lucide-react'

export default function QuizPage() {
    const { quizid } = useParams()
    const [questions, setQuestions] = useState<Question[]>([])
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

    const handleSave = async (question: Question) => {
        try {
            if (question._id?.startsWith('new-')) {
                // Remove the temporary ID before creating
                const { _id, ...newQuestion } = question
                await createQuestion(quizid as string, newQuestion)
                toast('Question created', {
                    description: 'The question has been created successfully.',
                })
            } else {
                await updateQuestion(quizid as string, question._id!, question)
                toast('Question updated', {
                    description: 'The question has been updated successfully.',
                })
            }
            await loadQuestions() // Reload questions after save
        } catch (error) {
            toast('Error', {
                description: error instanceof Error ? error.message : 'Failed to save question',
            })
        }
    }

    const handleDelete = async (questionId: string) => {
        try {
            await deleteQuestion(quizid as string, questionId)
            toast('Question deleted', {
                description: 'The question has been removed successfully.',
            })
            loadQuestions()
        } catch (error) {
            toast('Error', {
                description: error instanceof Error ? error.message : 'Failed to delete question',
            })
        }
    }

    const addNewQuestion = () => {
        const newQuestion: Question = {
            _id: `new-${Date.now()}`,
            type: 'MCQ',
            difficulty: 'easy',
            marks: 1,
            question: '',
            explanation: '',
            options: [
                { option: '', optionId: '1' },
                { option: '', optionId: '2' }
            ],
            answer: []
        }
        setQuestions([...questions, newQuestion])
    }

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
            <div className="flex gap-5 items-center">
                <Button variant="ghost" onClick={() => {
                    router.back()
                }}>
                    <ArrowLeft />
                    Back
                </Button>
                <h1 className="text-2xl font-bold">Quiz Questions</h1>
            </div>
            <div className='flex flex-col gap-4'>

                {questions.map((q) => (
                    <MCQCard
                        key={q._id}
                        question={q}
                        onSave={handleSave}
                        onDelete={handleDelete}
                        isNew={q._id?.startsWith('new-')}
                    />
                ))}
                <Button onClick={addNewQuestion}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                </Button>
            </div>
        </div>
    )
}

