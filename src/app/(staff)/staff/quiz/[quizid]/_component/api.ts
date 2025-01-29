import { Question, QuestionFormValues } from './types'

export async function fetchQuestions(quizId: string): Promise<Question[]> {
    const response = await fetch(`/api/staff/quiz/questions?quizId=${quizId}`)
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch questions')
    }
    return response.json()
}

export async function createQuestion(quizId: string, question: QuestionFormValues): Promise<void> {
    const response = await fetch('/api/staff/quiz/questions', {
        method: 'POST',
        body: JSON.stringify({ ...question, quizId }),
        headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create question')
    }
}

export async function updateQuestion(quizId: string, questionId: string, question: QuestionFormValues): Promise<void> {
    const response = await fetch('/api/staff/quiz/questions', {
        method: 'PUT',
        body: JSON.stringify({ ...question, quizId, _id: questionId }),
        headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update question')
    }
}

export async function deleteQuestion(quizId: string, questionId: string): Promise<void> {
    const response = await fetch('/api/staff/quiz/questions', {
        method: 'DELETE',
        body: JSON.stringify({ questionId, quizId }),
        headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete question')
    }
}

export async function fetchQuizDetails(quizId: string) {
    const response = await fetch(`/api/staff/quiz/${quizId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch quiz details');
    }
    
    return response.json();
}

