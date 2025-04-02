import type { Question, CodingQuestion, DifficultyLevel } from "@/types/questions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/hooks/use-toast";
import { Card } from "../ui/card";
import { AlertDialog } from "../ui/alert-dialog";
import { Dialog } from "../ui/dialog";
import { Language } from "@/lib/programming-languages";

interface CodeFile {
    id: string;
    name: string;
    language: string;
    content: string;
}

interface FunctionDetails {
    functionName: string;
    params: Array<{ name: string; type: string }>;
    returnType: string;
    language: Language;
}

import { CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, FileText, ListChecks, Type, X, Upload, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TiptapRenderer from '@/components/ui/tiptap-renderer';
import { LatexPreview } from '@/components/latex-preview';
import { CustomImage } from '@/components/ui/custom-image';
import { Label } from "@/components/ui/label";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CodeEditor from '../codeEditor/CodeEditor';

interface Topic {
    id: string;
    name: string;
}

interface QuestionsListProps {
    questions: Question[];
    onQuestionUpdate: (topics: string[]) => void;
    bankId: string;
    topic: string[];
    onEdit: (question: Question) => void;
    topics: Topic[];
    editingQuestion: Question | null;
    requireTopics?: boolean;
    showActions?: boolean;
    onDelete?: (questionId: string) => void;
}

const difficultyColors: Record<DifficultyLevel, string> = {
    EASY: "bg-green-100 text-green-800",
    MEDIUM: "bg-yellow-100 text-yellow-800",
    HARD: "bg-red-100 text-red-800"
};

export default function QuestionsList({
    questions,
    onEdit,
    bankId,
    topic,
    topics = [],
    onQuestionUpdate,
    editingQuestion,
    requireTopics = true,
    showActions = true,
    onDelete,
}: QuestionsListProps) {
    const { toast } = useToast();
    const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; questionId: string | null }>({
        isOpen: false,
        questionId: null
    });

    const [practiceDialog, setPracticeDialog] = useState<{ isOpen: boolean, questionId: string | null }>({
        isOpen: false,
        questionId: null
    });

    const [userCode, setUserCode] = useState<string>("");

    const [availableTopicsList, setAvailableTopicsList] = useState<string[]>([]);
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

    const handleCreateTopic = (newTopic: string) => {
        setAvailableTopicsList(prev => [...prev, newTopic]);
    };

    useEffect(() => {
        const fetchBankTopics = async () => {
            try {
                const response = await fetch(`/api/staff/bank/${bankId}/topics`);
                const data = await response.json();

                if (!response.ok) {
                    // Instead of throwing, we'll just set empty topics
                    console.warn('Failed to fetch topics:', data.message);
                    setAvailableTopicsList([]);
                    return;
                }

                setAvailableTopicsList(data.topics || []);
            } catch (error) {
                console.error('Error fetching topics:', error);
                setAvailableTopicsList([]);
            }
        };

        fetchBankTopics();
    }, [bankId]);

    const validQuestions = useMemo(() => {
        return questions ?? [];
    }, [questions]);

    const availableTopics = useMemo(() => {
        if (!topics || !Array.isArray(topics)) return [];
        return topics.filter(topic => !selectedTopics.includes(topic.id));
    }, [topics, selectedTopics]);

    const handleDelete = async (questionId: string) => {
        if (!questionId) return;
        try {
            if (onDelete) {
                await onDelete(questionId);
            } else {
                // Fallback to bank delete if no onDelete provided
                const id = questionId.toString();
                const response = await fetch(`/api/staff/bank/${bankId}/questions/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to delete question');
                }

                toast({ title: "Success", description: "Question deleted successfully" });
                onQuestionUpdate(topic);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to delete question",
                variant: "destructive"
            });
        }
        setDeleteDialog({ isOpen: false, questionId: null });
    };

    const handleTopicSelect = async (questionId: string, topicId: string, existingTopics: string[]) => {
        const updatedTopics = [...(existingTopics || []), topicId];
        try {
            const response = await fetch(`/api/staff/bank/${bankId}/questions/${questionId}/topics`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topics: updatedTopics })
            });

            if (!response.ok) {
                throw new Error('Failed to update topic');
            }

            if (onQuestionUpdate) {
                onQuestionUpdate(updatedTopics);
            }

            toast({
                title: "Success",
                description: "Topic added successfully"
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update topic",
                variant: "destructive"
            });
        }
    };

    const handleRemoveTopic = async (questionId: string, topicIdToRemove: string, existingTopics: string[]) => {
        const updatedTopics = existingTopics.filter(id => id !== topicIdToRemove);
        try {
            const response = await fetch(`/api/staff/bank/${bankId}/questions/${questionId}/topics`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topics: updatedTopics })
            });

            if (!response.ok) {
                throw new Error('Failed to remove topic');
            }

            if (onQuestionUpdate) {
                onQuestionUpdate(updatedTopics);
            }

            toast({
                title: "Success",
                description: "Topic removed successfully"
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to remove topic",
                variant: "destructive"
            });
        }
    };

    const getQuestionIcon = (type: string) => {
        switch (type) {
            case 'MCQ': return <ListChecks className="h-4 w-4" />;
            case 'FILL_IN_BLANK': return <Type className="h-4 w-4" />;
            case 'DESCRIPTIVE': return <FileText className="h-4 w-4" />;
            case 'CODING': return <Code className="h-4 w-4" />;
            case 'FILE_UPLOAD': return <Upload className="h-4 w-4" />;
            default: return null;
        }
    };

    const handleEdit = (question: Question) => {
        onEdit(question);
    };

    const topicMap = useMemo(() => {
        const map = new Map<string, string>();
        if (topics && Array.isArray(topics)) {
            topics.forEach((t: Topic) => map.set(t.id, t.name));
        }
        return map;
    }, [topics]);

    interface TestCase {
        inputs: any[];
        output: any;
    }

    const handlePracticeCode = (files: CodeFile[]) => {
        if (files[0]) {
            setUserCode(files[0].content);
        }
    };

    const renderQuestionCard = useCallback((question: Question, index: number) => {
        const questionId = question._id || question.id || '';
        const generateKey = (prefix: string) => `${questionId}-${prefix}`;

        return (
            <Card className="group hover:shadow-md transition-shadow dark:bg-gray-900 bg-gray-50">
                <CardHeader className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                            <span className="font-medium">Question {index + 1}</span>
                            <div className="flex items-center gap-2 text-muted-foreground ">
                                <div className="flex items-center gap-1.5">
                                    {getQuestionIcon(question.type)}
                                    <span className="text-sm">{question.type}</span>
                                </div>
                                <span className="text-sm px-2 py-0.5 rounded-full bg-muted">
                                    {question.mark || question.marks} marks
                                </span>
                                <span className={`text-sm px-2 py-0.5 rounded-full ${difficultyColors[question.difficulty]}`}>
                                    {question.difficulty}
                                </span>
                                {
                                    question.bloomsLevel && (

                                        <span className="text-sm px-2 py-0.5 rounded-full bg-muted">
                                            {question.bloomsLevel}
                                        </span>
                                    )

                                }
                                {question.courseOutcome && (
                                    <span className="text-sm px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                                        {question.courseOutcome}
                                    </span>
                                )}
                            </div>
                            <div className="prose dark:prose-invert max-w-none">
                                <TiptapRenderer content={question.question} />
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            {showActions && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(question)}
                                        disabled={editingQuestion?._id === question._id}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setDeleteDialog({ isOpen: true, questionId: questionId })}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                    {requireTopics && (
                        <div className="flex flex-row justify-between">
                            <div className="flex flex-wrap gap-2">
                                {question.topics?.map((topicId, index) => (
                                    <Badge key={`topic_${questionId}_${topicId}_${index}`} variant="secondary">
                                        {topicMap.get(topicId) || 'Unknown Topic'}
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <Select onValueChange={(value) => handleTopicSelect(questionId, value, question.topics || [])}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder={availableTopics.length === 0 ? "All topics selected" : "Add topic..."} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableTopics.map((topic: Topic) => (
                                            <SelectItem key={topic.id} value={topic.id}>
                                                {topic.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="pl-6 border-l-2 border-muted">
                        {(question.type === 'MCQ' || question.type === 'TRUE_FALSE') && (
                            <div className="space-y-2">
                                {question.options?.map((option) => (
                                    <div
                                        key={option.optionId}
                                        className={`flex items-start gap-2 p-2 rounded-lg ${question.answer?.includes(option.optionId)
                                            ? 'bg-green-500/10 dark:bg-green-500/20'
                                            : 'bg-muted/50'
                                            }`}
                                    >
                                        {question.answer?.includes(option.optionId) ? (
                                            <Check className="h-5 w-5 text-green-500 mt-0.5" />
                                        ) : (
                                            <X className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        )}
                                        <div className="space-y-1">
                                            <LatexPreview content={option.option} />
                                            {option.image && (
                                                <CustomImage
                                                    src={option.image}
                                                    alt={`Option ${option.optionId}`}
                                                    className="mt-2 rounded-lg border"
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {question.type === 'FILL_IN_BLANK' && (
                            <div key={generateKey('fill')}>
                                Answer: <LatexPreview content={question.expectedAnswer} />
                            </div>
                        )}
                        {question.type === 'DESCRIPTIVE' && question.expectedAnswer && (
                            <div key={generateKey('descriptive')} className="space-y-4">
                                <div>
                                    <Label className="text-muted-foreground mb-2">Expected Answer:</Label>
                                    <TiptapRenderer content={question.expectedAnswer} />
                                </div>
                                {question.guidelines && (
                                    <div>
                                        <Label className="text-muted-foreground mb-2">Marking Guidelines:</Label>
                                        <TiptapRenderer content={question.guidelines} />
                                    </div>
                                )}
                            </div>
                        )}
                        {question.type === 'CODING' && (
                            <div key={generateKey('coding')} className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <Label className="text-muted-foreground mb-2">Sample Solution:</Label>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setUserCode((question as CodingQuestion).boilerplateCode);
                                            setPracticeDialog({ isOpen: true, questionId: question._id || question.id || '' });
                                        }}
                                    >
                                        Try it yourself
                                    </Button>
                                </div>
                                <Card>
                                    <CardContent className="p-0">
                                        <CodeEditor
                                            files={[
                                                {
                                                    id: "solution",
                                                    name: "Solution",
                                                    language: (question as CodingQuestion).functionDetails.language,
                                                    content: `${(question as CodingQuestion).boilerplateCode}\n\n${(question as CodingQuestion).driverCode}`
                                                }
                                            ]}
                                            activeFileId="solution"
                                            onFileChange={() => { }}
                                            onActiveFileChange={() => { }}
                                            readOnly={true}
                                        />
                                    </CardContent>
                                </Card>
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Test Cases:</Label>
                                    <div className="space-y-2">
                                        {(question as CodingQuestion).testCases.map((testCase, idx) => (
                                            <div key={idx} className="p-2 bg-muted rounded-lg">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-sm text-muted-foreground">Input:</span>
                                                        <pre className="mt-1 text-sm">
                                                            {JSON.stringify(testCase.inputs, null, 2)}
                                                        </pre>
                                                    </div>
                                                    <div>
                                                        <span className="text-sm text-muted-foreground">Expected Output:</span>
                                                        <pre className="mt-1 text-sm">
                                                            {JSON.stringify(testCase.output, null, 2)}
                                                        </pre>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {question.type === 'FILE_UPLOAD' && question.attachedFile && (
                            <div key={generateKey('file')} className="flex items-center gap-4">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <a
                                    href={question.attachedFile}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    View Attached File
                                </a>
                            </div>
                        )}
                    </div>
                    {question.explanation && (
                        <div key={generateKey('explanation')} className="mt-4">
                            <Label className="text-muted-foreground mb-2">Explanation:</Label>
                            <TiptapRenderer content={question.explanation} />
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }, [onEdit, availableTopics, handleTopicSelect, handleRemoveTopic, topics]);

    if (validQuestions.length === 0) {
        return <div className="text-muted-foreground">No questions available</div>;
    }

    return (
        <>
            <div className="space-y-4">
                {validQuestions.map((question, index) => (
                    <div key={`question-${question._id || question.id || index}`}>
                        {renderQuestionCard(question, index)}
                    </div>
                ))}
            </div>

            <AlertDialog
                open={deleteDialog.isOpen}
                onOpenChange={(isOpen) =>
                    !isOpen && setDeleteDialog({ isOpen: false, questionId: null })
                }
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Question</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this question? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteDialog.questionId && handleDelete(deleteDialog.questionId)}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog
                open={practiceDialog.isOpen}
                onOpenChange={(isOpen) => !isOpen && setPracticeDialog({ isOpen: false, questionId: null })}
            >
                <DialogContent className="max-w-4xl h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Practice Question</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 mt-4">
                        {practiceDialog.questionId && (
                            <CodeEditor
                                files={[
                                    {
                                        id: "practice",
                                        name: "Your Solution",
                                        language: (questions.find(q =>
                                            (q._id || q.id) === practiceDialog.questionId
                                        ) as CodingQuestion)?.functionDetails.language || 'python',
                                        content: userCode
                                    }
                                ]}
                                activeFileId="practice"
                                onFileChange={(files) => {
                                    if (files[0]) {
                                        setUserCode(files[0].content);
                                    }
                                }}
                                onActiveFileChange={() => { }}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
