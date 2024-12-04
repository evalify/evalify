"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { LatexPreview } from '@/components/latex-preview'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'

interface Option {
    option: string
    optionId: string
}

interface Question {
    id: string
    question: string
    options: Option[]
    answer: string[]
    marks: number
    type: string
}

interface Quiz {
    id: string
    title: string
    description: string
    startTime: string
    endTime: string
    duration: number
}

const QuizPage = () => {
    const { quizId } = useParams()
    const [quiz, setQuiz] = useState<Quiz | null>(null)
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({})
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const router = useRouter();

    const fetchQuiz = async () => {
        try {
            if (!quizId) {
                return;
            }
            const res = await fetch(`/api/quiz/get?quizId=${quizId}`);
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            console.log(data);
            setQuiz(data.quiz);
            setQuestions(data.questions);
            localStorage.setItem(`quiz_${quizId}`, JSON.stringify(data.quiz));
            localStorage.setItem(`questions_${quizId}`, JSON.stringify(data.questions));
        } catch (error) {
            console.log('Error fetching quiz:', error);
        }
    }

    useEffect(() => {
        const storedQuiz = localStorage.getItem(`quiz_${quizId}`);
        const storedQuestions = localStorage.getItem(`questions_${quizId}`);
        const storedUserAnswers = localStorage.getItem(`userAnswers_${quizId}`);
        const storedTimeLeft = localStorage.getItem(`timeLeft_${quizId}`);

        if (storedQuiz && storedQuestions) {
            setQuiz(JSON.parse(storedQuiz));
            setQuestions(JSON.parse(storedQuestions));
        } else {
            fetchQuiz();
        }

        if (storedUserAnswers) {
            setUserAnswers(JSON.parse(storedUserAnswers));
        }

        if (storedTimeLeft) {
            setTimeLeft(Number(storedTimeLeft));
        }
    }, [quizId]);

    useEffect(() => {
        if (timeLeft === null) return;

        const timer = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime === null || prevTime <= 0) {
                    clearInterval(timer);
                    return 0;
                }
                const newTimeLeft = prevTime - 1;
                localStorage.setItem(`timeLeft_${quizId}`, newTimeLeft.toString());
                return newTimeLeft;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    const handleAnswerChange = (questionId: string, optionId: string, isChecked: boolean) => {
        setUserAnswers((prevAnswers) => {
            const currentAnswers = prevAnswers[questionId] || [];
            const newAnswers = isChecked
                ? { ...prevAnswers, [questionId]: [...currentAnswers, optionId] }
                : { ...prevAnswers, [questionId]: currentAnswers.filter(id => id !== optionId) };
            localStorage.setItem(`userAnswers_${quizId}`, JSON.stringify(newAnswers));
            return newAnswers;
        });
    }

    const handleRadioChange = (questionId: string, optionId: string) => {
        setUserAnswers((prevAnswers) => {
            const newAnswers = { ...prevAnswers, [questionId]: [optionId] };
            localStorage.setItem(`userAnswers_${quizId}`, JSON.stringify(newAnswers));
            return newAnswers;
        });
    }

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1)
        }
    }

    const handlePreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1)
        }
    }

    const saveAnswers = async () => {
        try {
            const res = await fetch('/api/quiz/save', {
                method: 'POST',
                body: JSON.stringify({
                    quizId,
                    responses: userAnswers,
                    voilations: 0
                })
            })
            if (!res.ok) {
                console.log('Failed to save quiz')
                return
            }
            const data = await res.json()
            router.push('/student/quiz')
            console.log(data)
            localStorage.clear();
        } catch (error) {
            console.log('Error saving quiz:', error)
        }
    }

    const handleSubmitQuiz = () => {
        // In a real application, you would send the userAnswers to the server here
        console.log('Quiz submitted:', userAnswers)
        saveAnswers()
    }

    if (!quiz || questions.length === 0) {
        return <div>Loading...</div>
    }

    const currentQuestion = questions[currentQuestionIndex]

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    return (
        <div className="container mx-auto p-4 max-w-3xl">
            <Card>
                <CardHeader>
                    <CardTitle>{quiz.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{quiz.description}</p>
                    <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4" />
                            <span className="font-medium">{formatTime(timeLeft || 0)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Question {currentQuestionIndex + 1} of {questions.length}
                        </div>
                    </div>
                    <Progress value={(currentQuestionIndex + 1) / questions.length * 100} className="mt-2" />
                </CardHeader>
                <CardContent>
                    <h2 className="text-xl font-semibold mb-4">
                        <LatexPreview content={currentQuestion.question} />
                    </h2>
                    {currentQuestion.type === 'MCQ' ? (
                        <RadioGroup
                            onValueChange={(value) => handleRadioChange(currentQuestion.id, value)}
                            value={userAnswers[currentQuestion.id]?.[0] || ''}
                        >
                            {currentQuestion.options.map((option) => (
                                <div key={option.optionId} className="flex items-center space-x-2 mb-2">
                                    <RadioGroupItem value={option.optionId} id={option.optionId} />
                                    <Label htmlFor={option.optionId}>
                                        <LatexPreview content={option.option} />
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    ) : (
                        currentQuestion.options.map((option) => (
                            <div key={option.optionId} className="flex items-center space-x-2 mb-2">
                                <Checkbox
                                    id={option.optionId}
                                    checked={userAnswers[currentQuestion.id]?.includes(option.optionId)}
                                    onCheckedChange={(checked) =>
                                        handleAnswerChange(currentQuestion.id, option.optionId, checked as boolean)
                                    }
                                />
                                <Label htmlFor={option.optionId}>
                                    <LatexPreview content={option.option} />
                                </Label>
                            </div>
                        ))
                    )}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0}>
                        <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>
                    {currentQuestionIndex === questions.length - 1 ? (
                        <Button onClick={handleSubmitQuiz}>Submit Quiz</Button>
                    ) : (
                        <Button onClick={handleNextQuestion}>
                            Next <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    )
}

export default QuizPage

