import { useCallback, useEffect, useMemo, useState } from "react";
import { Question } from "@/types/questions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Edit2, Trash2, Code, FileText, ListChecks, Type } from "lucide-react";
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
import { MultiSelect } from "@/components/ui/multi-select";

interface QuestionsListProps {
    questions: Question[];
    onQuestionUpdate: (topics: string[]) => void;
    bankId: string;
    topic: string[];
    onEdit: (question: Question) => void;
    allTopics: string[]; 
}

export default function QuestionsList({
    questions,
    onQuestionUpdate,
    bankId,
    topic,
    onEdit,
    allTopics 
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

    const handleTopicsChange = async (questionId: string, newTopics: string[]) => {
        try {
            const response = await fetch(`/api/staff/bank/${bankId}/questions/${questionId}/topics`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topics: newTopics })
            });

            if (!response.ok) {
                throw new Error('Failed to update topics');
            }

            
            if (onQuestionUpdate) {
                onQuestionUpdate(newTopics);
            }

            toast({
                title: "Success",
                description: "Topics updated successfully"
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update topics",
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

    
    const renderQuestionCard = useCallback((question: Question) => {
        const questionId = question._id || question.id;
        const generateKey = (prefix: string) => `${questionId}-${prefix}`;

        return (
            <Card className="group hover:shadow-md transition-shadow">
                <CardHeader className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                {getQuestionIcon(question.type)}
                                <span className="text-sm">{question.type}</span>
                            </div>
                            <p className="font-medium">{question.content}</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className="flex flex-col items-end gap-2">
                                <Badge variant={
                                    question.difficulty === 'EASY' ? 'secondary' :
                                        question.difficulty === 'MEDIUM' ? 'default' : 'destructive'
                                }>
                                    {question.difficulty}
                                </Badge>
                                <Badge variant="outline">{question.marks} marks</Badge>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem onClick={() => onEdit({ ...question, id: questionId })}>
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
                    <div className="flex flex-wrap gap-2">
                        {question.topics?.map((topic) => (
                            <Badge key={topic} variant="outline">
                                {topic}
                            </Badge>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Topics:</span>
                        <MultiSelect
                            options={availableTopics.map(t => ({ value: t, label: t })) || []}
                            value={(question.topics || []).map(t => ({ value: t, label: t }))}
                            onChange={(selected) => {
                                const newTopics = selected.map(s => s.value);
                                handleTopicsChange(question._id || question.id, newTopics);
                            }}
                            onInputChange={setInputValue}
                            inputValue={inputValue}
                            onCreateOption={(inputValue) => {
                                handleCreateTopic(inputValue);
                                setInputValue('');
                            }}
                            creatable
                            placeholder="Select or add topics..."
                            className="flex-1"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Question type specific content */}
                    <div className="pl-6 border-l-2 border-muted">
                        {(question.type === 'MCQ' || question.type === 'TRUE_FALSE') && (
                            <div className="space-y-2">
                                {question.options?.map((option, idx) => (
                                    <div
                                        key={`${questionId}-option-${idx}`}
                                        className={`p-2 rounded ${idx === question.correctOption
                                                ? 'bg-green-100 dark:bg-green-900'
                                                : 'bg-gray-50 dark:bg-gray-800'
                                            }`}
                                    >
                                        {option}
                                    </div>
                                ))}
                            </div>
                        )}
                        {question.type === 'FILL_IN_BLANK' && (
                            <div key={generateKey('fill')}>
                                Answer: {question.correctAnswer}
                            </div>
                        )}
                        {question.type === 'DESCRIPTIVE' && question.sampleAnswer && (
                            <div key={generateKey('desc')}>
                                Sample Answer: {question.sampleAnswer}
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
    }, [onEdit, availableTopics, handleTopicsChange, inputValue]); 

    if (validQuestions.length === 0) {
        return <div className="text-muted-foreground">No questions available</div>;
    }

    return (
        <>
            <div className="space-y-4">
                {validQuestions.map((question) => (
                    <div key={`question-${question._id || question.id}`}>
                        {renderQuestionCard(question)}
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
