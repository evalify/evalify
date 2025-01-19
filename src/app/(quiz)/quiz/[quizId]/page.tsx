"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronLeft, ChevronRight, Clock, AlertTriangle, CheckCircle2, Search, X, ImageOff } from 'lucide-react'
import Image from 'next/image'
import { cn } from "@/lib/utils"
import TiptapRenderer from '@/components/ui/tiptap-renderer'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

interface Option {
    option: string
    optionId: string
    image?: string
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
    const [quizStartTime, setQuizStartTime] = useState<number | null>(null)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)
    const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, boolean>>({})
    const [imageErrorStates, setImageErrorStates] = useState<Record<string, boolean>>({})
    const router = useRouter()

    // Update local storage key handling
    const getStorageKey = (key: string) => `quiz_${quizId}_${key}`;

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                if (!quizId) return
                const res = await fetch(`/api/quiz/get?quizId=${quizId}`)
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
                const data = await res.json()
                if (data.status === 404 || data.status === 400 || data.message === "Quiz already completed") {
                    router.push('/student/quiz')
                    alert("Quiz already completed")
                    return
                }
                setQuiz(data.quiz)
                setQuestions(data.questions)
                localStorage.setItem(getStorageKey('quiz'), JSON.stringify(data.quiz))
                localStorage.setItem(getStorageKey('questions'), JSON.stringify(data.questions))
            } catch (error: any) {
                console.error('Error fetching quiz:', error)
                if (error.status === 404 || error.status === 400 || error.message === "Quiz already completed") {
                    router.push('/student/quiz')
                    alert("Quiz already completed")
                }
            }
        }

        const storedQuiz = localStorage.getItem(getStorageKey('quiz'))
        const storedQuestions = localStorage.getItem(getStorageKey('questions'))
        const storedUserAnswers = localStorage.getItem(getStorageKey('answers'))
        const storedTimeLeft = localStorage.getItem(getStorageKey('timeLeft'))
        const startTime = localStorage.getItem(getStorageKey('startTime'))

        if (storedQuiz && storedQuestions) {
            setQuiz(JSON.parse(storedQuiz))
            setQuestions(JSON.parse(storedQuestions))
        } else {
            fetchQuiz()
        }

        if (storedUserAnswers) setUserAnswers(JSON.parse(storedUserAnswers))
        if (storedTimeLeft) setTimeLeft(Number(storedTimeLeft))

        if (!startTime) {
            const now = Date.now()
            localStorage.setItem(getStorageKey('startTime'), now.toString())
            setQuizStartTime(now)
        } else {
            setQuizStartTime(Number(startTime))
        }
    }, [quizId, router])

    useEffect(() => {
        if (!quiz?.duration || !quizStartTime) return

        const interval = setInterval(() => {
            const now = Date.now()
            const elapsed = Math.floor((now - quizStartTime) / 1000)
            const remaining = Math.max(0, quiz.duration * 60 - elapsed)

            setTimeLeft(remaining)
            localStorage.setItem(getStorageKey('timeLeft'), remaining.toString())

            if (remaining <= 0) {
                clearInterval(interval)
                handleSubmitQuiz()
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [quiz, quizStartTime, quizId])

    const handleAnswerChange = (questionId: string, optionId: string, isChecked: boolean) => {
        setUserAnswers((prevAnswers) => {
            const currentAnswers = prevAnswers[questionId] || []
            const newAnswers = isChecked
                ? { ...prevAnswers, [questionId]: [...currentAnswers, optionId] }
                : { ...prevAnswers, [questionId]: currentAnswers.filter(id => id !== optionId) }
            localStorage.setItem(getStorageKey('answers'), JSON.stringify(newAnswers))
            return newAnswers
        })
    }

    const handleRadioChange = (questionId: string, optionId: string) => {
        setUserAnswers((prevAnswers) => {
            const newAnswers = { ...prevAnswers, [questionId]: [optionId] }
            localStorage.setItem(getStorageKey('answers'), JSON.stringify(newAnswers))
            return newAnswers
        })
    }

    const handleDescriptiveAnswer = (questionId: string, answer: string) => {
        setUserAnswers((prevAnswers) => {
            const newAnswers = { ...prevAnswers, [questionId]: [answer] }
            localStorage.setItem(getStorageKey('answers'), JSON.stringify(newAnswers))
            return newAnswers
        })
    }

    const handleSubmitQuiz = async () => {
        try {
            const res = await fetch('/api/quiz/save', {
                method: 'POST',
                body: JSON.stringify({ quizId, responses: userAnswers })
            })

            if (!res.ok) throw new Error('Failed to save quiz')

            // Clear all quiz-related storage
            Object.keys(localStorage)
                .filter(key => key.startsWith(`quiz_${quizId}_`))
                .forEach(key => localStorage.removeItem(key));

            router.push('/student/quiz')
        } catch (error) {
            console.error('Error saving quiz:', error)
        }
    }

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    const calculateProgress = () => {
        const answeredQuestions = questions.filter(q =>
            userAnswers[q.id] && userAnswers[q.id].length > 0
        ).length
        return (answeredQuestions / questions.length) * 100
    }

    const handleImageLoad = (imageUrl: string) => {
        setImageLoadingStates(prev => ({ ...prev, [imageUrl]: false }))
    }

    const handleImageError = (imageUrl: string) => {
        setImageErrorStates(prev => ({ ...prev, [imageUrl]: true }))
        setImageLoadingStates(prev => ({ ...prev, [imageUrl]: false }))
    }

    const ImageWithFallback = ({ src, alt, ...props }: any) => {
        if (imageErrorStates[src]) {
            return (
                <div className="flex items-center justify-center bg-muted rounded-md p-4 min-h-[150px]">
                    <div className="flex flex-col items-center text-muted-foreground">
                        <ImageOff className="h-8 w-8 mb-2" />
                        <span className="text-sm">Image not available</span>
                    </div>
                </div>
            )
        }

        return (
            <div className="relative">
                {imageLoadingStates[src] !== false && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-md">
                        <div className="animate-pulse w-8 h-8 bg-primary/20 rounded-full" />
                    </div>
                )}
                <Image
                    src={src}
                    alt={alt}
                    onLoadingComplete={() => handleImageLoad(src)}
                    onError={() => handleImageError(src)}
                    {...props}
                />
            </div>
        )
    }

    const renderQuestion = (question: Question) => {
        switch (question.type) {
            case 'MCQ':
            case 'MMCQ':
                return (
                    <div className="space-y-4">
                        <TiptapRenderer content={question.question} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {question.type === 'MCQ' ? (
                                <RadioGroup
                                    value={userAnswers[question.id]?.[0] || ''}
                                    onValueChange={(value) => handleRadioChange(question.id, value)}
                                >
                                    {question.options?.map((option) => (
                                        <div
                                            key={option.optionId}
                                            className={cn(
                                                "flex items-start space-x-3 p-4 rounded-lg transition-colors",
                                                "hover:bg-muted/50 cursor-pointer",
                                                userAnswers[question.id]?.includes(option.optionId) &&
                                                "bg-primary/10 hover:bg-primary/20"
                                            )}
                                        >
                                            <RadioGroupItem value={option.optionId} id={option.optionId} />
                                            <Label htmlFor={option.optionId} className="flex-1 cursor-pointer">
                                                {option.image && option.image.length > 0 && (
                                                    <div
                                                        className="relative mb-2 cursor-zoom-in transition-transform hover:scale-[1.02]"
                                                        onClick={() => setSelectedImage(option.image)}
                                                    >
                                                        <ImageWithFallback
                                                            src={option.image}
                                                            alt={`Image for option: ${option.option}`}
                                                            width={200}
                                                            height={150}
                                                            className="rounded-md object-cover"
                                                        />
                                                    </div>
                                                )}
                                                <TiptapRenderer content={option.option} />
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            ) : (
                                question.options?.map((option) => (
                                    <div
                                        key={option.optionId}
                                        className={cn(
                                            "flex items-start space-x-3 p-4 rounded-lg transition-colors",
                                            "hover:bg-muted/50 cursor-pointer",
                                            userAnswers[question.id]?.includes(option.optionId) &&
                                            "bg-primary/10 hover:bg-primary/20"
                                        )}
                                    >
                                        <Checkbox
                                            id={option.optionId}
                                            checked={userAnswers[question.id]?.includes(option.optionId)}
                                            onCheckedChange={(checked) =>
                                                handleAnswerChange(question.id, option.optionId, checked as boolean)
                                            }
                                        />
                                        <Label htmlFor={option.optionId} className="flex-1 cursor-pointer">
                                            {option.image && option.image.length > 0 && (
                                                <div
                                                    className="relative mb-2 cursor-zoom-in transition-transform hover:scale-[1.02]"
                                                    onClick={() => setSelectedImage(option.image)}
                                                >
                                                    <ImageWithFallback
                                                        src={option.image}
                                                        alt={`Image for option: ${option.option}`}
                                                        width={200}
                                                        height={150}
                                                        className="rounded-md object-cover"
                                                    />
                                                </div>
                                            )}
                                            <TiptapRenderer content={option.option} />
                                        </Label>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )

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
                )

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
                )

            default:
                return <div>Unsupported question type</div>
        }
    }

    if (!quiz || questions.length === 0) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>
    }

    return (
        <div className="h-[90vh] flex flex-col bg-background">
            <header className="sticky top-0 z-10 bg-background border-b">
                <div className="container mx-auto p-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold">{quiz.title}</h1>
                            <div className="flex items-center mt-2 text-sm text-muted-foreground">
                                <Progress value={calculateProgress()} className="w-40 mr-2" />
                                <span>{Math.round(calculateProgress())}% complete</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-sm">
                                Question {currentQuestionIndex + 1} of {questions.length}
                            </div>
                            <div className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-full">
                                <Clock className="h-4 w-4" />
                                <span className="font-medium">{formatTime(timeLeft || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto p-4 overflow-hidden">
                <div className="flex gap-8 h-[80vh]">
                    <div className="w-3/4 flex flex-col h-[80vh]">
                        <Card className="flex-1 flex flex-col overflow-hidden">
                            <CardHeader className="border-b">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{questions[currentQuestionIndex].type}</Badge>
                                        <Badge>{questions[currentQuestionIndex].marks} marks</Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto mt-6">
                                {renderQuestion(questions[currentQuestionIndex])}
                            </CardContent>
                        </Card>
                        
                        <div className="sticky bottom-0 left-0 right-0 mt-4 bg-background py-4 border-t">
                            <div className="flex justify-between items-center">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
                                        window.scrollTo(0, 0);
                                    }}
                                    disabled={currentQuestionIndex === 0}
                                >
                                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                                </Button>
                                {currentQuestionIndex === questions.length - 1 ? (
                                    <Button onClick={() => setIsSubmitDialogOpen(true)}>
                                        Submit Quiz
                                    </Button>
                                ) : (
                                    <Button 
                                        onClick={() => {
                                            setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1));
                                            window.scrollTo(0, 0);
                                        }}
                                    >
                                        Next <ChevronRight className="ml-2 h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="w-1/4">
                        <Card className="sticky top-4">
                            <CardHeader>
                                <CardTitle>Question Navigator</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[60vh]">
                                    <div className="grid grid-cols-5 gap-2">
                                        {questions.map((q, index) => (
                                            <Button
                                                key={q.id}
                                                variant={currentQuestionIndex === index ? "default" : "outline"}
                                                className={cn(
                                                    "w-10 h-10",
                                                    userAnswers[q.id] && userAnswers[q.id].length > 0 && "bg-primary/20"
                                                )}
                                                onClick={() => setCurrentQuestionIndex(index)}
                                            >
                                                {index + 1}
                                            </Button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            <AlertDialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Submit Quiz</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have answered {Object.keys(userAnswers).length} out of {questions.length} questions.
                            Are you sure you want to submit?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSubmitQuiz}>Submit</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={!!selectedImage}
                onOpenChange={() => setSelectedImage(null)}
            >
                <AlertDialogContent
                    className="relative max-w-4xl w-auto h-auto p-1 bg-background/95 backdrop-blur-sm"
                    onClick={(e) => e.stopPropagation()}
                >
                    <AlertDialogHeader className="absolute inset-x-0 top-0 z-50 flex justify-between items-center p-2">
                        <AlertDialogTitle className="sr-only">Image Preview</AlertDialogTitle>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full bg-background/80 ml-auto"
                            onClick={() => setSelectedImage(null)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </AlertDialogHeader>
                    {selectedImage && selectedImage.length > 0 && (
                        <div className="relative mt-8">
                            <ImageWithFallback
                                src={selectedImage}
                                alt="Enlarged view of question option image"
                                width={800}
                                height={600}
                                className="rounded-lg"
                                style={{ objectFit: 'contain', maxHeight: 'calc(80vh - 2rem)' }}
                                priority
                            />
                        </div>
                    )}
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

export default QuizPage

