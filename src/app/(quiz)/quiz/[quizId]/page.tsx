"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
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
import { ChevronLeft, ChevronRight, Clock, X, ImageOff, AlertTriangle, LoaderCircle, Download, Upload, FileIcon, CodeXml, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { cn } from "@/lib/utils"
import TiptapRenderer from '@/components/ui/tiptap-renderer'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LatexPreview } from '@/components/latex-preview'
import CodeEditor from '@/components/codeEditor/CodeEditor'
import { nanoid } from 'nanoid'
import { useSession } from 'next-auth/react'

interface CodeFile {
    id: string
    name: string
    language: string
    content: string
}

interface Option {
    option: string
    optionId: string
    image?: string
}

interface Question {
    id: string
    question: string
    options?: Option[]
    mark: number
    type: 'MCQ' | 'MMCQ' | 'TRUE_FALSE' | 'FILL_IN_BLANK' | 'DESCRIPTIVE' | 'FILE_UPLOAD' | "CODING";
    isMultiple?: boolean;
    attachedFile?: string;
}

interface Quiz {
    id: string
    title: string
    description: string
    startTime: string
    endTime: string
    settings: {
        shuffle?: boolean;
        autoSubmit: boolean;
        fullscreen: boolean;
        calculator: boolean;
        shuffle_options: boolean;
        linear_quiz: boolean;
    };
    duration: number;
}

interface Violation {
    message: string;
    timestamp: Date;
}

function useQuizTimer(
    quiz: Quiz | null,
    quizStartTime: Date | null,
    onTimeUp: () => Promise<boolean>,
    setIsTimeWarning: (value: boolean) => void,
    setWarningMessage: (value: string | null) => void
) {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const autoSubmit = quiz?.settings?.autoSubmit || false;

    useEffect(() => {
        if (!quiz?.duration || !quizStartTime) return;

        const startTimeMs = new Date(quizStartTime).getTime();
        const endTime = startTimeMs + (quiz.duration * 60 * 1000);
        const now = Date.now();

        if (now >= endTime) {
            setTimeLeft(0);
            // if (autoSubmit) {
            //     onTimeUp();
            // }
            return;
        }

        // Calculate initial time left
        const initialTimeLeft = Math.floor((endTime - now) / 1000);
        setTimeLeft(initialTimeLeft);

        const interval = setInterval(() => {
            const currentTime = Date.now();
            const remaining = Math.max(0, Math.floor((endTime - currentTime) / 1000));

            setTimeLeft(remaining);

            if (remaining <= 300) {
                setIsTimeWarning(true);
            }

            if (remaining <= 0) {
                clearInterval(interval);
                // if (autoSubmit) {
                //     onTimeUp();
                // }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [quiz, quizStartTime, onTimeUp, autoSubmit, setIsTimeWarning]);

    return timeLeft;
}

function ImagePreviewDialog({ image, isOpen, onClose }: { image: string | null, isOpen: boolean, onClose: () => void }) {
    if (!image) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-[90vw] h-[90vh] p-0">
                <div className="relative w-full h-full">
                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute top-2 right-2 z-50"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    <div className="w-full h-full flex items-center justify-center">
                        <Image
                            src={image}
                            alt="Preview"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Move getStorageKey outside the component since it doesn't depend on component state
const getStorageKey = (quizId: string | string[], key: string) => `quiz_${quizId}_${key}`;

const QuizPage = () => {
    const params = useParams() as { quizId: string };
    const searchParams = useSearchParams();
    const quizId = params.quizId;
    const router = useRouter();
    const session = useSession();
    const { data: sessionData } = session;


    // Extract question parameter from URL
    const questionParam = searchParams.get('question');
    
    // Group all state hooks together
    const [quiz, setQuiz] = useState<Quiz | null>(null);

    // Update fullscreen check to include quiz settings
    const isFullscreenRequired = quiz?.settings?.fullscreen ?? false;
    const isAutoSubmitEnabled = quiz?.settings?.autoSubmit ?? false;
    const isCalculatorEnabled = quiz?.settings.calculator ?? false;
    const isLinearQuizEnabled = quiz?.settings?.linear_quiz?? false;

    const [questions, setQuestions] = useState<Question[]>([]);
    // Initialize with questionParam if available
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    // Track if we've initialized from URL
    const initializedFromUrl = useRef(false);
    const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({});
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
    const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, boolean>>({});
    const [imageErrorStates, setImageErrorStates] = useState<Record<string, boolean>>({});
    const [isTimeWarning, setIsTimeWarning] = useState(false);
    const [warningMessage, setWarningMessage] = useState<string | null>("Only 5 minutes remaining!");
    const [violations, setViolations] = useState<Violation[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
    const maxRetryAttempts = 5;
    const [retryAttempts, setRetryAttempts] = useState(0);
    const [showRetryDialog, setShowRetryDialog] = useState(false);

    // Initialize editor files without localStorage
    const [editorFiles, setEditorFiles] = useState<CodeFile[]>([
        { id: nanoid(), name: 'file', language: 'octave', content: '' }
    ]);
    const [activeEditorFile, setActiveEditorFile] = useState(editorFiles[0].id);

    // Load editor state from localStorage on mount
    useEffect(() => {
        const savedFiles = localStorage.getItem(`calculator_files_${quizId}`);
        const savedActiveFile = localStorage.getItem(`calculator_active_file_${quizId}`);

        if (savedFiles) {
            setEditorFiles(JSON.parse(savedFiles));
        }
        if (savedActiveFile) {
            setActiveEditorFile(savedActiveFile);
        }
    }, [quizId]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(`calculator_files_${quizId}`, JSON.stringify(editorFiles));
        }
    }, [editorFiles, quizId]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(`calculator_active_file_${quizId}`, activeEditorFile);
        }
    }, [activeEditorFile, quizId]);

    // Handle URL updates separately from state
    const changeQuestion = useCallback((index: number) => {
        setCurrentQuestionIndex(index);
        
        // Update URL without triggering a re-render
        const url = new URL(window.location.href);
        url.searchParams.set('question', index.toString());
        window.history.replaceState({}, '', url.toString());
        window.scrollTo(0, 0);
    }, []);

    // Initialize from URL only once when questions load
    useEffect(() => {
        if (questions.length > 0 && questionParam && !initializedFromUrl.current) {
            const index = parseInt(questionParam);
            if (!isNaN(index) && index >= 0 && index < questions.length) {
                setCurrentQuestionIndex(index);
            }
            initializedFromUrl.current = true;
        }
    }, [questions.length, questionParam]);

    const handleSubmitQuiz = useCallback(async (): Promise<boolean> => {
        setIsSubmitting(true);
        setSubmissionError(null);
        
        try {
            await fetch ('/api/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: "Quiz submit request",
                    quizId,
                    studentId: sessionData?.user.rollNo,
                })
            })

            const res = await fetch('/api/quiz/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    quizId,
                    responses: userAnswers,
                    violations: violations.map(v => `${new Date(v.timestamp).toISOString()}: ${v.message}`).join('\n')
                })
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(data?.error || 'Failed to submit quiz');
            }

            // On success, clean up and redirect
            localStorage.removeItem(getStorageKey(quizId, 'answers'));
            localStorage.removeItem(`violations_${quizId}`);
            localStorage.removeItem(`calculator_files_${quizId}`);
            localStorage.removeItem(`calculator_active_file_${quizId}`);
            localStorage.clear();
            
            router.push('/student/quiz');
            return true;
        } catch (error) {
            console.error('Error saving quiz:', error);
            setSubmissionError(error instanceof Error ? error.message : "Failed to submit quiz");
            setIsSubmitting(false);
            return false;
        }
    }, [quizId, userAnswers, violations, router]);

    const updateAnswers = useCallback(async (answers: Record<string, string[]>) => {
        try {
            await fetch('/api/quiz/update-response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quizId, responses: answers })
            });
        } catch (error) {
            console.error('Error updating responses:', error);
        }
    }, [quizId]);

    // Handle auto-submission with retries
    const handleAutoSubmit = useCallback(async (): Promise<boolean> => {
        setIsAutoSubmitting(true);
        setRetryAttempts(0);
        
        const attemptSubmission = async (): Promise<boolean> => {
            try {
                // Show the warning that time is up and quiz is being submitted
                setWarningMessage("Time's up! Submitting your quiz...");
                
                const success = await handleSubmitQuiz();
                if (success) {
                    setIsAutoSubmitting(false);
                    return true;
                } else {
                    throw new Error("Submission failed");
                }
            } catch (error) {
                console.error("Auto-submit attempt failed:", error);
                if (retryAttempts < maxRetryAttempts) {
                    setRetryAttempts(prev => prev + 1);
                    // Wait 2 seconds before retrying
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return attemptSubmission();
                } else {
                    setShowRetryDialog(true);
                    setIsAutoSubmitting(false);
                    return false;
                }
            }
        };
        
        return attemptSubmission();
    }, [handleSubmitQuiz, maxRetryAttempts, retryAttempts, setWarningMessage]);

    // Use the updated function for the timer
    const timeLeft = useQuizTimer(quiz, quizStartTime, handleAutoSubmit, setIsTimeWarning, setWarningMessage);

    // Manual retry function for user-initiated retries
    const handleRetrySubmission = async () => {
        setShowRetryDialog(false);
        setIsSubmitting(true);
        const success = await handleSubmitQuiz();
        if (!success) {
            setShowRetryDialog(true);
        }
    };

    // Group related effects together
    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                if (!quizId) return;
                const res = await fetch(`/api/quiz/get?quizId=${quizId}`);
                const data = await res.json();

                if (!res.ok) {
                    switch (res.status) {
                        case 402:
                        case 404:
                        case 400:
                            router.push('/student/quiz')
                            toast.error(data.message || "Cannot access quiz")
                            return
                        default:
                            throw new Error(data.error || "Failed to fetch quiz")
                    }
                }

                setQuiz(data.quiz);
                setQuestions(data.questions);
                // if (data.responses){
                //     setUserAnswers(data.responses);
                // }
                if (data.quizAttempt?.startTime) {
                    setQuizStartTime(new Date(data.quizAttempt.startTime));
                }
            } catch (error) {
                console.error('Error:', error)
                toast.error("Failed to load quiz")
                router.push('/student/quiz')
            }
        };

        const storedAnswers = localStorage.getItem(getStorageKey(quizId, 'answers'));
        if (storedAnswers) {
            setUserAnswers(JSON.parse(storedAnswers));
        }

        fetchQuiz();
        const fetchInterval = setInterval(fetchQuiz, 5 * 60 * 1000);
        return () => clearInterval(fetchInterval);
    }, [quizId, router]);

    // Answer update effect
    useEffect(() => {
        if (!quizId || !userAnswers || Object.keys(userAnswers).length === 0) return;

        const saveInterval = setInterval(() => {
            updateAnswers(userAnswers);
        }, 60000);

        updateAnswers(userAnswers);
        return () => clearInterval(saveInterval);
    }, [quizId, userAnswers, updateAnswers]);

    useEffect(() => {
        const loadViolations = () => {
            const stored = localStorage.getItem(`violations_${quizId}`);
            if (stored) {
                try {
                    setViolations(JSON.parse(stored));
                } catch (error) {
                    localStorage.removeItem(`violations_${quizId}`);
                }
            }
        };

        const setupSecurityListeners = () => {
            const handleFullscreenChange = () => {
                const isFs = !!document.fullscreenElement;
                setIsFullscreen(isFs);
                // Only track violation if fullscreen is required
                if (!isFs && isFullscreenRequired) {
                    handleViolation("Fullscreen mode exited");
                }
            };

            const handleVisibilityChange = () => {
                if (document.hidden) {
                    handleViolation("Tab switching is not allowed");
                }
            };

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    e.preventDefault()
                }
                if (e.ctrlKey && e.shiftKey && e.key === "i") {
                    e.preventDefault()
                    handleViolation("Developer tools shortcut detected")
                }
            }

            const handleContextMenu = (e: MouseEvent) => {
                e.preventDefault()
            }

            document.addEventListener("fullscreenchange", handleFullscreenChange);
            document.addEventListener("visibilitychange", handleVisibilityChange);
            document.addEventListener("keydown", handleKeyDown);
            document.addEventListener("contextmenu", handleContextMenu);

            return () => {
                document.removeEventListener("fullscreenchange", handleFullscreenChange);
                document.removeEventListener("visibilitychange", handleVisibilityChange);
                document.removeEventListener("keydown", handleKeyDown);
                document.removeEventListener("contextmenu", handleContextMenu);
            };
        };

        loadViolations();
        const cleanup = setupSecurityListeners();
        return () => cleanup();
    }, [quizId, isFullscreenRequired]);

    const handleViolation = (message: string) => {
        const violation = { message, timestamp: new Date() }
        setViolations(prev => {
            const updated = [...prev, violation]
            localStorage.setItem(`violations_${quizId}`, JSON.stringify(updated))
            return updated
        })
    }

    const requestFullscreen = async () => {
        try {
            await document.documentElement.requestFullscreen();
            setIsFullscreen(true);
            setHasPermission(true);
        } catch (err) {
            if (!isFullscreenRequired) {
                setHasPermission(true);
            }
            console.error("Fullscreen permission denied:", err);
        }
    };

    if (!hasPermission || (isFullscreenRequired && !isFullscreen)) {
        return (
            <div className="fixed inset-0 bg-background flex items-center justify-center">
                <div className="p-6 rounded-lg shadow-lg max-w-md text-center">
                    <h2 className="text-xl font-bold mb-4">
                        {isFullscreenRequired ? 'Fullscreen Required' : 'Fullscreen Recommended'}
                    </h2>
                    <p className="mb-4">
                        {isFullscreenRequired
                            ? 'Please enable fullscreen mode to continue with the quiz.'
                            : 'It is recommended to take the quiz in fullscreen mode for better experience.'}
                    </p>
                    <div className="space-x-4">
                        <Button onClick={requestFullscreen}>
                            Enter Fullscreen
                        </Button>
                        {!isFullscreenRequired && (
                            <Button variant="outline" onClick={() => setHasPermission(true)}>
                                Continue Without Fullscreen
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const handleAnswerChange = (questionId: string, optionId: string, isChecked: boolean) => {
        setUserAnswers((prevAnswers) => {
            const currentAnswers = prevAnswers[questionId] || []
            const newAnswers = isChecked
                ? { ...prevAnswers, [questionId]: [...currentAnswers, optionId] }
                : { ...prevAnswers, [questionId]: currentAnswers.filter(id => id !== optionId) }
            localStorage.setItem(getStorageKey(quizId, 'answers'), JSON.stringify(newAnswers))
            return newAnswers
        })
    }

    const handleRadioChange = (questionId: string, optionId: string) => {
        setUserAnswers((prevAnswers) => {
            const currentAnswer = prevAnswers[questionId]?.[0];
            const newAnswers = currentAnswer === optionId
                ? { ...prevAnswers, [questionId]: [] }
                : { ...prevAnswers, [questionId]: [optionId] };
            localStorage.setItem(getStorageKey(quizId, 'answers'), JSON.stringify(newAnswers));
            return newAnswers;
        });
    };

    // Update handleDescriptiveAnswer to handle both string and array inputs
    const handleDescriptiveAnswer = (questionId: string, answer: string | string[]) => {
        setUserAnswers((prevAnswers) => {
            const newAnswers = {
                ...prevAnswers,
                [questionId]: Array.isArray(answer) ? answer : [answer]
            };
            localStorage.setItem(getStorageKey(quizId, 'answers'), JSON.stringify(newAnswers));
            return newAnswers;
        });
    };

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

    // Add this component after the   component and before QuizPage component
    const AttachedFile = ({ fileUrl }: { fileUrl: string }) => {
        const fileName = fileUrl.split('/').pop() || 'Attached File';

        return (
            <div className="flex items-center gap-2 p-3 bg-muted/10 border rounded-lg w-fit">
                <FileIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {fileName}
                </span>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(fileUrl, '_blank')}
                >
                    <Download className="h-4 w-4" />
                </Button>
            </div>
        );
    };

    const renderQuestion = (question: Question) => {
        return (
            <div className="space-y-4">
                <TiptapRenderer content={question.question} />

                {/* Add this block right after TiptapRenderer */}
                {question.attachedFile && (
                    <div className="my-4">
                        <Label className="text-sm text-muted-foreground mb-2">Attached File:</Label>
                        <AttachedFile fileUrl={question.attachedFile} />
                    </div>
                )}

                {/* Rest of your switch statement */}
                {(() => {
                    switch (question.type) {
                        case 'MCQ':
                        case 'TRUE_FALSE':
                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                                    <LatexPreview content={option.option} />
                                                </Label>
                                                {option.image && option.image.length > 0 && (
                                                    <div
                                                        className="relative mb-2 cursor-zoom-in transition-transform hover:scale-[1.02] ml-16"
                                                        onClick={() => setSelectedImage(option.image || "")}
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
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                            );
                        case 'MMCQ':
                            return (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                                            onClick={() => setSelectedImage(option.image || "")}
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
                                    </div>
                                </div>
                            );
                        case 'FILL_IN_BLANK':
                            return (
                                <div className="space-y-4">
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
                        case 'FILE_UPLOAD':
                            return (
                                <div className="space-y-4" >
                                    <div className="mt-4" >
                                        <FileUpload
                                            quizId={quizId}
                                            questionId={question.id}
                                            onUpload={(url) => handleDescriptiveAnswer(question.id, [url])}
                                            currentFile={userAnswers[question.id]?.[0]}
                                        />
                                    </div>
                                </div>
                            );
                        case 'CODING':
                            // Initialize editor with boilerplate code if available
                            const codingLanguage = question.language || 'python';
                            const boilerplateCode = question.boilerplateCode || '';

                            // Create initial file with the correct language and boilerplate code
                            const initialFile = {
                                id: nanoid(),
                                name: 'solution',
                                language: codingLanguage,
                                content: boilerplateCode
                            };

                            // Initialize files if not already in answers
                            const codingFiles = userAnswers[question.id]?.[0]
                                ? JSON.parse(userAnswers[question.id][0])
                                : [initialFile];

                            // Set activeFileId to the first file
                            const activeFileId = codingFiles[0]?.id;

                            return (
                                <div className="w-full">
                                    <CodeEditor
                                        files={codingFiles}
                                        activeFileId={activeFileId}
                                        onFileChange={(files) => {
                                            const fileData = JSON.stringify(files);
                                            handleDescriptiveAnswer(question.id, [fileData]);
                                        }}
                                        onActiveFileChange={(fileId) => {
                                            // No need to change answer, just update active file
                                        }}
                                        boilerplateCode={question.boilerplateCode || ''}
                                        driverCode={question.driverCode || ''}
                                    />
                                </div>
                            );
                        default:
                            return <div>Unsupported question type</div>
                    }
                })()}
            </div>
        );
    }

    interface FileUploadProps {
        quizId: string;
        questionId: string;
        onUpload: (fileUrl: string) => void;
        currentFile?: string;
    }

    const FileUpload = ({ quizId, questionId, onUpload, currentFile }: FileUploadProps) => {
        const [isUploading, setIsUploading] = useState(false);
        const [dragActive, setDragActive] = useState(false);
        const [loadingState, setLoadingState] = useState<'uploading' | 'removing' | 'processing' | 'completing' | 'idle'>('idle');
        const [uploadProgress, setUploadProgress] = useState(0);
        const [operationProgress, setOperationProgress] = useState(0);
        const inputRef = useRef<HTMLInputElement>(null);
        const [fileInputKey, setFileInputKey] = useState(Date.now());
        const operationProgressRef = useRef<NodeJS.Timeout | null>(null);
        const [uploadedFileName, setUploadedFileName] = useState<string>("");

        const handleDownload = () => {
            if (currentFile) {
                window.open(currentFile, '_blank');
            }
        };

        const handleDrag = (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.type === "dragenter" || e.type === "dragover") {
                setDragActive(true);
            } else if (e.type === "dragleave") {
                setDragActive(false);
            }
        };

        const simulateProgress = () => {
            setUploadProgress(0);
            const interval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 95) {
                        clearInterval(interval);
                        return prev;
                    }
                    return prev + 5;
                });
            }, 100);
            return interval;
        };

        const startOperationProgress = () => {
            setOperationProgress(0);
            return setInterval(() => {
                setOperationProgress(prev => {
                    if (prev >= 100) return prev;
                    return prev + 2;
                });
            }, 50);
        };

        const handleUpload = async (file: File) => {
            if (file.size > 10 * 1024 * 1024) {
                toast.error("File size must be less than 10MB");
                return;
            }

            if (currentFile) {
                await handleRemove();
            }

            setLoadingState('uploading');
            setUploadedFileName(file.name);
            const progressInterval = simulateProgress();
            operationProgressRef.current = startOperationProgress();

            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('quizId', quizId);
                formData.append('questionId', questionId);

                const xhr = new XMLHttpRequest();
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const progress = Math.round((event.loaded / event.total) * 100);
                        setUploadProgress(progress);
                    }
                });

                const uploadPromise = new Promise((resolve, reject) => {
                    xhr.onload = () => {
                        if (xhr.status === 200) {
                            resolve(JSON.parse(xhr.responseText));
                        } else {
                            reject(new Error('Upload failed'));
                        }
                    };
                    xhr.onerror = () => reject(new Error('Upload failed'));
                });

                xhr.open('POST', '/api/quiz/upload-response');
                xhr.send(formData);

                const data = await uploadPromise;
                setLoadingState('completing');

                toast.success("File uploaded successfully");

                onUpload(data.url);   
                    
            } catch (error) {
                console.error('Upload error:', error);
                toast.error("Failed to upload file");
            } finally {
                clearInterval(progressInterval);
                if (operationProgressRef.current) {
                    clearInterval(operationProgressRef.current);
                    operationProgressRef.current = null;
                }
                setLoadingState('idle');
                setUploadProgress(0);
                setOperationProgress(0);
                setDragActive(false);
            }
        };

        const handleRemove = async () => {
            setLoadingState('removing');
            operationProgressRef.current = startOperationProgress();

            try {
                await fetch('/api/quiz/delete-response', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        quizId,
                        questionId,
                    }),
                });

                setLoadingState('completing');
                toast.success("File removed successfully");

                onUpload("");
            } catch (error) {
                console.error('Remove error:', error);
                toast.error("Failed to remove file");
            } finally {
                if (operationProgressRef.current) {
                    clearInterval(operationProgressRef.current);
                    operationProgressRef.current = null;
                }
                setLoadingState('idle');
                setOperationProgress(0);
            }
        };

        const handleDrop = async (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            const file = e.dataTransfer.files?.[0];
            if (file) {
                await handleUpload(file);
            }
        };

        const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            try {
                await handleUpload(file);
            } catch (error) {
                console.error('Upload error:', error);
            } finally {
                if (inputRef.current) {
                    inputRef.current.value = '';
                }
                setFileInputKey(Date.now());
            }
        };

        const handleClick = (e: React.MouseEvent) => {
            e.preventDefault();
            if (loadingState === 'idle' && inputRef.current) {
                inputRef.current.click();
            }
        };

        const getFileIcon = (fileName: string) => {
            const ext = fileName.split('.').pop()?.toLowerCase();
            switch (ext) {
                case 'pdf': return '📄';
                case 'doc':
                case 'docx': return '📝';
                case 'xls':
                case 'xlsx': return '📊';
                case 'zip':
                case 'rar': return '📦';
                case 'ipynb': return '📓';
                default: return '📄';
            }
        };

        return (
            <div className="space-y-4 relative">
                {loadingState !== 'idle' && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
                        <div className="w-64 space-y-4">
                            <div className="space-y-2 text-center">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                <p className="text-sm">
                                    {loadingState === 'uploading' && `Uploading... ${uploadProgress}%`}
                                    {loadingState === 'processing' && 'Processing file...'}
                                    {loadingState === 'removing' && 'Removing file...'}
                                    {loadingState === 'completing' && 'Finishing up...'}
                                </p>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{
                                        width: `${loadingState === 'uploading' ? uploadProgress : operationProgress}%`
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {!currentFile ? (
                    <>
                        <input
                            key={fileInputKey}
                            ref={inputRef}
                            type="file"
                            className="hidden"
                            id="file"
                            name="file"
                            onChange={(e) => { console.log("Files : ", e.target.files); handleChange(e) }}
                            accept="*/*"
                            disabled={loadingState !== 'idle'}
                        />
                        <div
                            className={cn(
                                "relative w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors",
                                dragActive
                                    ? "border-primary/50 bg-primary/5"
                                    : "border-muted-foreground/20 hover:border-muted-foreground/40",
                                loadingState !== 'idle' && "pointer-events-none opacity-80"
                            )}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={handleClick}
                        >
                            {
                                loadingState !== 'idle' ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        {loadingState === 'uploading' && (
                                            <>
                                                <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary transition-all duration-300"
                                                        style={{ width: `${uploadProgress}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm text-muted-foreground">
                                                    {uploadedFileName && `Uploading ${uploadedFileName}...`} {uploadProgress}%
                                                </span>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="h-6 w-6 mb-2 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">
                                            Drag and drop or click to upload
                                        </p>
                                        <p className="text-xs text-muted-foreground/60 mt-1">
                                            Any file up to 10MB
                                        </p>
                                    </>
                                )
                            }
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-4 w-full">
                        <div className="flex-1 p-3 border rounded-lg bg-muted/10">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{getFileIcon(currentFile)}</span>
                                <span className="text-sm text-muted-foreground truncate">
                                    {currentFile.split('/').pop()}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={handleRemove}
                                disabled={loadingState !== 'idle'}
                            >
                                {loadingState === 'removing' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <X className="h-4 w-4" />
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={handleDownload}
                                disabled={loadingState !== 'idle'}
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const ViolationsCounter = () => (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "fixed top-2 right-36 z-50",
                        violations.length > 0 && "bg-red-100 hover:bg-red-200 border-red-500 text-red-600"
                    )}
                >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    {violations.length} Violations
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="space-y-2">
                    <h4 className="font-medium">Violations Log</h4>
                    <ScrollArea className="h-[200px]">
                        {violations.map((v, idx) => (
                            <div key={idx} className="text-sm py-1 border-b last:border-0">
                                <span className="text-muted-foreground text-xs">
                                    {new Date(v.timestamp).toLocaleTimeString()}:
                                </span>{' '}
                                {v.message}
                            </div>
                        ))}
                    </ScrollArea>
                </div>
            </PopoverContent>
        </Popover>
    )

    if (!quiz || questions.length === 0) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>
    }

    // Update the navigation button handlers
    const handlePrevious = () => {
        const newIndex = Math.max(0, currentQuestionIndex - 1);
        changeQuestion(newIndex);
    };

    const handleNext = () => {
        const newIndex = Math.min(questions.length - 1, currentQuestionIndex + 1);
        changeQuestion(newIndex);
    };

    return (
        <div className="h-[90vh] flex flex-col bg-background">
            {isFullscreenRequired && <ViolationsCounter />}
            <header className="sticky top-0 z-10 bg-background border-b">
                <div className="container mx-auto p-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold mb-2">{quiz?.title || 'Loading...'}</h1>
                            {isTimeWarning && warningMessage && (
                                <div className="mt-2 text-sm text-red-600 bg-red-100 px-3 py-2 rounded-md animate-pulse">
                                    {warningMessage}
                                </div>
                            )}
                            <div className="flex items-center mt-2 text-sm text-muted-foreground">
                                <Progress value={calculateProgress()} className="w-40 mr-2" />
                                <span>{Math.round(calculateProgress())}% complete</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-sm">
                                Question {currentQuestionIndex + 1} of {questions.length}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <div className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-full transition-colors duration-300",
                                    isTimeWarning
                                        ? "bg-red-100 text-red-600 font-bold"
                                        : "bg-primary/10"
                                )}>
                                    <Clock className={cn(
                                        "h-4 w-4",
                                        isTimeWarning && "animate-pulse"
                                    )} />
                                    <span className="font-medium">
                                        {timeLeft ? formatTime(timeLeft) : "--:--"}
                                    </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {isAutoSubmitEnabled
                                        && "* Auto-submission enabled"}
                                </div>
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
                                        <Badge>{questions[currentQuestionIndex].mark} marks</Badge>
                                    </div>
                                    {
                                        isCalculatorEnabled && (
                                            <div className="flex items-center gap-2">
                                                <Dialog>
                                                    <DialogTrigger>
                                                        <CodeXml className="h-4 w-4" />
                                                    </DialogTrigger>
                                                    <DialogContent className="w-[90%] max-w-[1400px] mx-auto">
                                                        <DialogTitle>Calculator</DialogTitle>
                                                        <CodeEditor
                                                            files={editorFiles}
                                                            activeFileId={activeEditorFile}
                                                            onFileChange={setEditorFiles}
                                                            onActiveFileChange={setActiveEditorFile}
                                                        />
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        )
                                    }
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
                                    onClick={handlePrevious}
                                    disabled={currentQuestionIndex === 0 || isLinearQuizEnabled}
                                >
                                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                                </Button>
                                {currentQuestionIndex === questions.length - 1 ? (
                                    <Button onClick={() => setIsSubmitDialogOpen(true)}>
                                        Submit Quiz
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleNext}
                                    >
                                        Next <ChevronRight className="ml-2 h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="w-1/4">
                        <Card className="sticky">
                            <CardHeader>
                                <CardTitle>Questions</CardTitle>
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
                                                onClick={() => changeQuestion(index)}
                                                disabled={isLinearQuizEnabled || false}
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
                        <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleSubmitQuiz}
                            disabled={isSubmitting}
                            className="relative"
                        >
                            {isSubmitting && (
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {isSubmitting ? 'Submitting...' : 'Submit'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* Add a retry dialog */}
            <AlertDialog open={showRetryDialog} onOpenChange={setShowRetryDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Submission Failed</AlertDialogTitle>
                        <AlertDialogDescription>
                            We couldn't submit your quiz. {submissionError ? `Error: ${submissionError}` : ''}
                            Please try again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            onClick={handleRetrySubmission}
                            disabled={isSubmitting}
                            className="relative"
                        >
                            {isSubmitting && (
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {isSubmitting ? 'Retrying...' : 'Retry Submission'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Show overlay when submitting */}
            {(isSubmitting || isAutoSubmitting) && (
                <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
                    <div className="flex flex-col items-center gap-2">
                        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">
                            {isAutoSubmitting 
                                ? `Automatically submitting your quiz... ${retryAttempts > 0 ? `(Attempt ${retryAttempts + 1}/${maxRetryAttempts + 1})` : ''}`
                                : "Submitting your quiz..."}
                        </p>
                        {submissionError && (
                            <p className="text-sm text-red-500 mt-2">{submissionError}</p>
                        )}
                    </div>
                </div>
            )}

            <ImagePreviewDialog
                image={selectedImage}
                isOpen={!!selectedImage}
                onClose={() => setSelectedImage(null)}
            />
        </div>
    )
}

export default QuizPage

