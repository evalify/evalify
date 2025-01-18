import { useCallback, useEffect, useMemo, useState } from "react";
import { Question } from "@/types/questions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Edit2, Trash2, Code, FileText, ListChecks, Type, Plus, X } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/hooks/use-toast";
import {
    AlertDialog,
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
    allTopics: string[];
    editingQuestion: Question | null;
}

export default function QuestionsList({ 
    questions, 
    onEdit, 
    bankId, 
    topic, 
    onQuestionUpdate,
    editingQuestion 
}: QuestionsListProps) {
    const { toast } = useToast();
    const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; questionId: string | null }>({
        isOpen: false,
        questionId: null
    });

    const [availableTopics, setAvailableTopics] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState('');

    const handleCreateTopic = (newTopic: string) => {
        setAvailableTopics(prev => [...prev, newTopic]);
    };


    useEffect(() => {
        const fetchBankTopics = async () => {
            try {
                const response = await fetch(`/api/staff/bank/${bankId}/topics`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Failed to fetch topics');
                }

                setAvailableTopics(data.topics || []);
            } catch (error) {
                console.log('Error fetching topics:', error);
                setAvailableTopics([]);
            }
        };

        fetchBankTopics();
    }, [bankId]);


    const validQuestions = useMemo(() => {
        return Array.isArray(questions) ? questions : [];
    }, [questions]);

    const handleDelete = async (questionId: string) => {
        try {
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
        const updatedTopics = [...existingTopics, topicId];
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
            default: return null;
        }
    };

    const handleEdit = (question: Question) => {
        onEdit(question);
    };

    const renderQuestionCard = useCallback((question: Question, index: number) => {
        const questionId = question._id || question.id;
        const generateKey = (prefix: string) => `${questionId}-${prefix}`;

        return (
            <Card className="group hover:shadow-md transition-shadow dark:bg-gray-900 bg-gray-50">
                <CardHeader className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                                <span className="font-medium">Question {index + 1}</span>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                {getQuestionIcon(question.type)}
                                <span className="text-sm">{question.type}</span>
                            </div>
                            <div className="prose dark:prose-invert max-w-none">
                                <TiptapRenderer content={question.question} />
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className="flex flex-col items-end gap-2">
                                <Badge variant={
                                    question.difficulty === 'EASY' ? 'secondary' :
                                        question.difficulty === 'MEDIUM' ? 'default' : 'destructive'
                                }>
                                    {question.difficulty}
                                </Badge>
                                <Badge variant="outline">{`${question.mark} marks`}</Badge>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40 z-50">
                                    <DropdownMenuItem onClick={() => handleEdit({
                                        ...question,
                                        id: questionId,
                                        content: question.question, // Make sure to map question content correctly
                                        topics: question.topics || [],
                                        options: question.options || [],
                                        answer: question.answer || [],
                                        expectedAnswer: question.expectedAnswer || '',
                                        mark: question.mark || 1
                                    })}>
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => setDeleteDialog({
                                            isOpen: true,
                                            questionId: questionId
                                        })}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    <div className="flex flex-row justify-between">
                        <div className="flex flex-wrap gap-2">
                            {question.topics?.map((topicId) => (
                                <Badge key={topicId} variant="outline" className="flex items-center gap-1">
                                    {(availableTopics.find(t => t.id === topicId))?.name || topicId}
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleRemoveTopic(questionId, topicId, question.topics || []);
                                        }}
                                        className="ml-1 hover:text-destructive"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Add Topic:</span>
                            <Select
                                onValueChange={(value) => handleTopicSelect(questionId, value, question.topics || [])}
                            >
                                <SelectTrigger className="w-64">
                                    <SelectValue>
                                        <span>Add Topic</span>
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {availableTopics
                                        .filter(topic => !(question.topics || []).includes(topic.id))
                                        .map((topic) => (
                                            <SelectItem key={topic.id} value={topic.id}>
                                                <div className="flex items-center gap-2">
                                                    <Plus className="h-4 w-4" />
                                                    <span>{topic.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                </CardHeader>
                <CardContent>
                    {/* Question type specific content */}
                    <div className="pl-6 border-l-2 border-muted">
                        {(question.type === 'MCQ' || question.type === 'TRUE_FALSE') && (
                            <div className="space-y-2">
                                {question.options?.map((option) => (
                                    <div
                                        key={option.optionId}
                                        className={`p-2 rounded ${question.answer.includes(option.optionId)
                                            ? 'bg-green-100 dark:bg-green-900'
                                            : 'bg-gray-50 dark:bg-gray-800'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Option text with LaTeX support */}
                                            <div className="flex-1">
                                                <LatexPreview content={option.option} />
                                            </div>
                                            {/* Option image if exists */}
                                            {option.image && (
                                                <CustomImage 
                                                    src={option.image} 
                                                    alt={`Option ${option.option}`}
                                                    className="rounded"
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
                            <div key={generateKey('desc')}>
                                <h4 className="font-medium mb-2">Sample Answer:</h4>
                                <TiptapRenderer content={question.expectedAnswer} />
                            </div>
                        )}
                        {question.type === 'CODING' && question.testCases && (
                            <div className="space-y-2" key={generateKey('coding')}>
                                <h4 className="font-medium">Test Cases:</h4>
                                {question.testCases.map((testCase, idx) => (
                                    <div key={`${questionId}-testcase-${idx}`} className="text-sm">
                                        <div>Input: {testCase.input}</div>
                                        <div>Expected Output: {testCase.output}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }, [onEdit, availableTopics, handleTopicSelect, handleRemoveTopic]);

    if (validQuestions.length === 0) {
        return <div className="text-muted-foreground">No questions available</div>;
    }

    return (
        <>
            <div className="space-y-4">
                {validQuestions.map((question, index) => (
                    <div key={`question-${question._id || question.id}`}>
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
        </>
    );
}
