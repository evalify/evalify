// "use client"

// import React, { use, useEffect, useState } from 'react'

// type Props = {
//     params: {
//         quizId: Promise<{ quizId: string }>
//     }
// }

// function page({ params }: Props) {
//     const [quizId, setQuizId] = useState<string | null>(null);
//     const [quiz, setQuiz] = useState<any | null>(null);

//     useEffect(() => {
//         async function resolveParams() {
//             const param = await params;
//             const { quizId: temp_quizId } = param;
//             setQuizId(temp_quizId);
//             if (temp_quizId) {
//                 fetchQuiz();
//             }
//         }
//         resolveParams();
//     }, [])

//     const fetchQuiz = async () => {
//         try {
//             if (!quizId) {
//                 return;
//             }
//             const res = await fetch(`/api/quiz/get?quizId=${quizId}`,
//             );
//             if (!res.ok) {
//                 throw new Error(`HTTP error! status: ${res.status}`);
//             }
//             const data = await res.json();
//             console.log(data);
//             setQuiz(data);
//         } catch (error) {
//             console.log('Error fetching quiz:', error);
//         }
//     }


//     useEffect(() => {
//         fetchQuiz();
//     }, [quizId])


//     return (
//         <div>
//             {
//                 quizId
//             }
//             <pre>

//                 {
//                     JSON.stringify(quiz, null, 4)
//                 }
//             </pre>
//         </div>
//     )
// }

// export default page

"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
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



    // useEffect(() => {
    //     async function resolveParams() {
    //         const param = await params;
    //         const { quizId: temp_quizId } = param;
    //         setQuizId(temp_quizId);
    //         if (temp_quizId) {
    //             fetchQuiz();
    //         }
    //     }
    //     resolveParams();
    // }, [])

    const fetchQuiz = async () => {
        try {
            if (!quizId) {
                return;
            }
            const res = await fetch(`/api/quiz/get?quizId=${quizId}`,
            );
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            console.log(data);
            setQuiz(data.quiz);
            setQuestions(data.questions);
        } catch (error) {
            console.log('Error fetching quiz:', error);
        }
    }


    useEffect(() => {
        fetchQuiz();
    }, [quizId])




    // useEffect(() => {
    //     // In a real application, fetch the quiz data from an API
    //     // For this example, we'll use the provided data
    //     const quizData = {
    //         "quiz": {
    //             "id": "cm48hbtqc000n7ke782lhlx0q",
    //             "title": "Math + ML : Exam 1",
    //             "description": "Math + ML Common Exam",
    //             "startTime": "2024-12-04T10:30:00.000Z",
    //             "endTime": "2024-12-04T11:15:00.000Z",
    //             "duration": 45,
    //         },
    //         "questions": [
    //             {
    //                 "id": "674fe49a44e143e768cc53ce",
    //                 "question": "what is the color of the moon ?",
    //                 "options": [
    //                     { "option": "Yellow", "optionId": "1" },
    //                     { "option": "Red", "optionId": "2" },
    //                     { "option": "black", "optionId": "1733289097923" },
    //                     { "option": "Blue", "optionId": "1733289106505" }
    //                 ],
    //                 "answer": ["1", "2"],
    //                 "marks": 1,
    //                 "type": "MMCQ",
    //             },
    //             {
    //                 "id": "674fe54144e143e768cc53cf",
    //                 "question": "What is Water?",
    //                 "options": [
    //                     { "option": "H30", "optionId": "1" },
    //                     { "option": "O2H", "optionId": "2" },
    //                     { "option": "OO2", "optionId": "1733289271253" },
    //                     { "option": "CC2", "optionId": "1733289275670" }
    //                 ],
    //                 "answer": ["2", "1733289271253"],
    //                 "marks": 1,
    //                 "type": "MMCQ",
    //             },
    //             {
    //                 "id": "674fe78a44e143e768cc53d0",
    //                 "question": "What is $x^2 $?\n",
    //                 "options": [
    //                     { "option": "Square of x", "optionId": "1" },
    //                     { "option": "x multiplied by 2", "optionId": "2" }
    //                 ],
    //                 "answer": ["1"],
    //                 "marks": 1,
    //                 "type": "MCQ",
    //             }
    //         ]
    //     }
    //     setQuiz(quizData.quiz)
    //     setQuestions(quizData.questions)
    //     setTimeLeft(quizData.quiz.duration * 60) // Convert minutes to seconds
    // }, [quizId])

    useEffect(() => {
        if (timeLeft === null) return

        const timer = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime === null || prevTime <= 0) {
                    clearInterval(timer)
                    return 0
                }
                return prevTime - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [timeLeft])

    const handleAnswerChange = (questionId: string, optionId: string, isChecked: boolean) => {
        setUserAnswers((prevAnswers) => {
            const currentAnswers = prevAnswers[questionId] || []
            if (isChecked) {
                return { ...prevAnswers, [questionId]: [...currentAnswers, optionId] }
            } else {
                return { ...prevAnswers, [questionId]: currentAnswers.filter(id => id !== optionId) }
            }
        })
    }

    const handleRadioChange = (questionId: string, optionId: string) => {
        setUserAnswers((prevAnswers) => ({
            ...prevAnswers,
            [questionId]: [optionId]
        }))
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

    const handleSubmitQuiz = () => {
        // In a real application, you would send the userAnswers to the server here
        console.log('Quiz submitted:', userAnswers)
        // You could also navigate to a results page or show a completion message
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

