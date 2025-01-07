"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock } from 'lucide-react'

interface QuizNavigationProps {
    totalQuestions: number
    currentQuestionIndex: number
    onQuestionSelect: (index: number) => void
    timeLeft: number | null
    onSubmitQuiz: () => void
}

export function QuizNavigation({
    totalQuestions,
    currentQuestionIndex,
    onQuestionSelect,
    timeLeft,
    onSubmitQuiz
}: QuizNavigationProps) {
    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    return (
        <Card className="w-[280px] h-full">
            <CardHeader>
                <CardTitle>Quiz Timer</CardTitle>
                <div className="flex items-center justify-center text-3xl font-bold mt-2">
                    <Clock className="mr-2 h-6 w-6" />
                    {formatTime(timeLeft || 0)}
                </div>
                {timeLeft === 0 && (
                    <div className="text-red-500 text-sm text-center mt-2">
                        Time&apos;s Up!<br />
                        The quiz time has ended.<br />
                        Please submit your answers.
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <h3 className="font-semibold">Questions</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {Array.from({ length: totalQuestions }, (_, i) => (
                            <Button
                                key={i}
                                variant={i === currentQuestionIndex ? "default" : "outline"}
                                className={cn(
                                    "h-10 w-10",
                                    i === currentQuestionIndex && "bg-primary text-primary-foreground"
                                )}
                                onClick={() => onQuestionSelect(i)}
                            >
                                {i + 1}
                            </Button>
                        ))}
                    </div>
                    <Button
                        className="w-full mt-8"
                        onClick={onSubmitQuiz}
                        variant="default"
                    >
                        Submit Quiz
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

