"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { LatexPreview } from '@/components/latex-preview'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea";
import TiptapRenderer from '@/components/ui/tiptap-renderer';
import { cn } from "@/lib/utils";

interface Option {
    option: string
    optionId: string
}

interface Question {
    id: string
    question: string
    options?: Option[]
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
            if (data.status === 404 || data.status === 400 || data.message === "Quiz already completed") {
                router.push('/student/quiz')
                alert("Quiz already completed")
                return
            }
            setQuiz(data.quiz);
            setQuestions(data.questions);
            localStorage.setItem(`quiz_${quizId}`, JSON.stringify(data.quiz));
            localStorage.setItem(`questions_${quizId}`, JSON.stringify(data.questions));
        } catch (error: any) {
            if (error.status === 404 || error.status === 400 || error.message === "Quiz already completed") {
                router.push('/student/quiz')
                alert("Quiz already completed")
            }
            console.log('Error fetching quiz:', error);
        }
    }

    useEffect(() => {
        const storedQuiz = localStorage.getItem(`quiz_${quizId}`);
        const storedQuestions = localStorage.getItem(`questions_${quizId}`);
        const storedUserAnswers = localStorage.getItem(`userAnswers_${quizId}`);
        const storedTimeLeft = localStorage.getItem(`timeLeft_${quizId}`);
        const storedViolations = localStorage.getItem(`violations_${quizId}`);

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

        if (storedViolations) {
            (window as any).globalState = {
                violations: JSON.parse(storedViolations)
            };
        }
    }, [quizId]);

    useEffect(() => {
        const storedViolations = localStorage.getItem(`violations_${quizId}`);

        if (!(window as any).globalState) {
            (window as any).globalState = { violations: [] };
        }

        if (storedViolations) {
            (window as any).globalState.violations = JSON.parse(storedViolations);
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

    const handleDescriptiveAnswer = (questionId: string, answer: string) => {
        setUserAnswers((prevAnswers) => {
            const newAnswers = { ...prevAnswers, [questionId]: [answer] };
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
            const violations = (window as any).globalState?.violations || [];
            const violationsString = violations
                .map((v: { message: string; timestamp: Date }) =>
                    `${new Date(v.timestamp).toLocaleString()}: ${v.message}`)
                .join('\n');

            const res = await fetch('/api/quiz/save', {
                method: 'POST',
                body: JSON.stringify({
                    quizId,
                    responses: userAnswers,
                    violations: violationsString
                })
            });

            if (!res.ok) {
                console.log('Failed to save quiz');
                return;
            }

            localStorage.removeItem(`quiz_${quizId}`);
            localStorage.removeItem(`questions_${quizId}`);
            localStorage.removeItem(`userAnswers_${quizId}`);
            localStorage.removeItem(`timeLeft_${quizId}`);
            localStorage.removeItem(`violations_${quizId}`);

            router.push('/student/quiz');
        } catch (error) {
            console.log('Error saving quiz:', error);
        }
    };

    const handleSubmitQuiz = () => {
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

    const renderQuestion = (question: Question) => {
        switch (question.type) {
            case 'MCQ':
            case 'MMCQ':
                return (
                    <div className="space-y-4">
                        <TiptapRenderer content={question.question} />
                        <div className="space-y-2">
                            {question.options?.map((option) => (
                                <div 
                                    key={option.optionId} 
                                    className={cn(
                                        "flex items-start space-x-3 p-3 rounded-lg transition-colors",
                                        "hover:bg-muted/50 cursor-pointer",
                                        userAnswers[question.id]?.includes(option.optionId) && 
                                        "bg-primary/10 hover:bg-primary/20"
                                    )}
                                    onClick={() => {
                                        if (question.type === 'MCQ') {
                                            handleRadioChange(question.id, option.optionId);
                                        } else {
                                            handleAnswerChange(
                                                question.id,
                                                option.optionId,
                                                !userAnswers[question.id]?.includes(option.optionId)
                                            );
                                        }
                                    }}
                                >
                                    {question.type === 'MCQ' ? (
                                        <RadioGroupItem 
                                            value={option.optionId}
                                            checked={userAnswers[question.id]?.[0] === option.optionId}
                                        />
                                    ) : (
                                        <Checkbox
                                            id={option.optionId}
                                            checked={userAnswers[question.id]?.includes(option.optionId)}
                                        />
                                    )}
                                    <div className="flex-1">
                                        <TiptapRenderer content={option.option} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'FILL_IN_BLANK':
                return (
                    <div className="space-y-4">
                        <TiptapRenderer content={question.question} />
                        <div>
                            <Label htmlFor="answer">Your Answer</Label>
                            <input
                                type="text"
                                id="answer"
                                className="w-full p-2 mt-2 rounded-md border"
                                value={userAnswers[question.id]?.[0] || ''}
                                onChange={(e) => handleDescriptiveAnswer(question.id, e.target.value)}
                                placeholder="Type your answer here..."
                            />
                        </div>
                    </div>
                );

            case 'DESCRIPTIVE':
                return (
                    <div className="space-y-4">
                        <TiptapRenderer content={question.question} />
                        <div>
                            <Label htmlFor="answer">Your Answer</Label>
                            <Textarea
                                id="answer"
                                className="min-h-[200px] mt-2"
                                value={userAnswers[question.id]?.[0] || ''}
                                onChange={(e) => handleDescriptiveAnswer(question.id, e.target.value)}
                                placeholder="Type your answer here..."
                            />
                        </div>
                    </div>
                );

            default:
                return <div>Unsupported question type</div>;
        }
    };

    const calculateProgress = () => {
        const answeredQuestions = questions.filter(q => 
            userAnswers[q.id] && userAnswers[q.id].length > 0
        ).length;
        return (answeredQuestions / questions.length) * 100;
    };

    return (
        <div className="container mx-auto p-4 max-w-3xl">
            <Card className="mb-4">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>{quiz.title}</CardTitle>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">{formatTime(timeLeft || 0)}</span>
                        </div>
                    </div>
                    <Progress 
                        value={calculateProgress()} 
                        className="mt-2"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>{calculateProgress().toFixed(0)}% completed</span>
                        <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">{currentQuestion.type}</Badge>
                        <Badge>{currentQuestion.marks} marks</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {renderQuestion(currentQuestion)}
                </CardContent>
                <CardFooter className="flex justify-between pt-6 border-t">
                    <Button 
                        variant="outline"
                        onClick={handlePreviousQuestion} 
                        disabled={currentQuestionIndex === 0}
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>
                    {currentQuestionIndex === questions.length - 1 ? (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="default">
                                    Submit Quiz
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Submit Quiz</DialogTitle>
                                    <DialogDescription>
                                        You have answered {Object.keys(userAnswers).length} out of {questions.length} questions.
                                        Are you sure you want to submit?
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex justify-end gap-2">
                                    <DialogClose asChild>
                                        <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button 
                                        variant="default"
                                        onClick={handleSubmitQuiz}
                                    >
                                        Submit
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
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

