"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, MoreVertical } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Question } from "@/types/questions";

import { Badge } from '@/components/ui/badge';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import QuestionsList from '@/components/bank/QuestionsList';
import QuestionForm from '@/components/bank/QuestionForm';

interface Topic {
    id: string;
    name: string;
}

interface Bank {
    name: string;
    description: string;
}

const QuestionsPage = () => {
    const params = useParams();
    const [bank, setBank] = useState<Bank | null>(null);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [newTopic, setNewTopic] = useState("");
    const [editingTopic, setEditingTopic] = useState<{ id: string, name: string } | null>(null);
    const [selectedTopics, setSelectedTopics] = useState<Topic[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isAddingQuestion, setIsAddingQuestion] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [allTopics, setAllTopics] = useState<string[]>([]);
    const [topicToDelete, setTopicToDelete] = useState<string | null>(null);
    const editFormRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchBankDetails();
        fetchTopics();
    }, []);

    useEffect(() => {
        if (selectedTopics.length > 0) {
            fetchQuestions(selectedTopics);
        } else {
            setQuestions([]);
        }
    }, [selectedTopics]);

    const fetchBankDetails = async () => {
        try {
            const response = await fetch(`/api/staff/bank/${params.id}`);
            const data = await response.json();
            if (response.ok) {
                setBank(data);
            }
        } catch (error) {
            console.log('Error fetching bank details:', error);
        }
    };

    const fetchTopics = async () => {
        try {
            const response = await fetch(`/api/staff/bank/${params.id}/topics`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch topics');
            }

            setTopics(data.topics || []);
            setAllTopics(data.topics.map((topic: Topic) => topic.name));
        } catch (error) {
            console.log('Error fetching topics:', error);
            setTopics([]);
            setAllTopics([]);
        }
    };

    const fetchQuestions = async (selectedTopics: Topic[]) => {
        try {
            const topicsParam = selectedTopics.map(t => t.id).join(',');
            const response = await fetch(`/api/staff/bank/${params.id}/questions?topic=${topicsParam}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            const data = await response.json();
            setQuestions(Array.isArray(data.questions) ? data.questions : []);
        } catch (error) {
            setQuestions([]);
        }
    };

    const handleCreateTopic = async () => {
        if (!newTopic.trim()) return;

        const response = await fetch(`/api/staff/bank/${params.id}/topics`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newTopic.trim() }),
        });
        if (response.ok) {
            setNewTopic("");
            fetchTopics();
        }
    };

    const handleUpdateTopic = async () => {
        if (!editingTopic?.name.trim() || !editingTopic.id) {
            setEditingTopic(null);
            return;
        }

        const response = await fetch(`/api/staff/bank/${params.id}/topics`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                topicId: editingTopic.id,
                name: editingTopic.name.trim()
            }),
        });
        if (response.ok) {
            setEditingTopic(null);
            fetchTopics();
        }
    };

    const handleDeleteTopic = async (topicId: string) => {
        setTopicToDelete(null); // Close the dialog
        const response = await fetch(`/api/staff/bank/${params.id}/topics`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topicId }),
        });
        if (response.ok) {
            fetchTopics();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCreateTopic();
        }
    };

    const getFilteredQuestions = (type: string): Question[] => {
        if (!Array.isArray(questions)) return [];
        if (type === 'all') return questions;
        return questions.filter(q => q?.type === type.toUpperCase());
    };

    const handleEditQuestion = (question: Question) => {
        setEditingQuestion(question);
        setIsAddingQuestion(true);
    };

    const handleTopicClick = (topic: Topic) => {
        const isSelected = selectedTopics.some(t => t.id === topic.id);
        let newSelectedTopics: Topic[];

        if (isSelected) {
            newSelectedTopics = selectedTopics.filter(t => t.id !== topic.id);
        } else {
            newSelectedTopics = [...selectedTopics, topic];
        }

        setSelectedTopics(newSelectedTopics);
        if (newSelectedTopics.length > 0) {
            fetchQuestions(newSelectedTopics);
        } else {
            setQuestions([]);
        }
    };

    const handleQuestionUpdate = (topics: string[]) => {

        if (Array.isArray(topics) && topics.length > 0) {
            fetchQuestions(topics);
        }
    };

    const handleSaveQuestion = async (questionData: Question) => {
        try {
            const endpoint = questionData._id
                ? `/api/staff/bank/${params.id}/questions/${questionData._id}`
                : `/api/staff/bank/${params.id}/questions`;

            const method = questionData._id ? 'PATCH' : 'POST';

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(questionData),
            });


            // Refresh questions list
            fetchQuestions(selectedTopics);
            setIsAddingQuestion(false);
            setEditingQuestion(null);

        } catch (error) {
            console.error('Error saving question:', error);
            throw error;
        }
    };

    return (
        <div className="h-[88vh] flex">
            {/* Fixed Sidebar */}
            <div className="w-[280px] fixed  h-[88vh] border-r dark:border-gray-800 bg-background">
                <div className="flex flex-col h-full">
                    <div className="flex-none border-b dark:border-gray-800">
                        <h2 className="font-semibold text-lg">Topics</h2>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                            {topics.map((topic) => (
                                <div
                                    key={topic.id}
                                    className={cn(
                                        "group flex items-center justify-between p-2",
                                        "rounded-md transition-colors",
                                        "hover:bg-muted",
                                        selectedTopics.some(t => t.id === topic.id) && "bg-muted",
                                        editingTopic?.id === topic.id && "bg-muted",
                                        "relative",
                                        "w-full"
                                    )}
                                    onClick={() => handleTopicClick(topic)}
                                >
                                    {editingTopic?.id === topic.id ? (
                                        <Input
                                            value={editingTopic.name}
                                            onChange={(e) =>
                                                setEditingTopic({ ...editingTopic, name: e.target.value })
                                            }
                                            onBlur={handleUpdateTopic}
                                            className="h-8"
                                            autoFocus
                                        />
                                    ) : (
                                        <>
                                            <div className="flex-1 min-w-0 mr-2">
                                                <div className="truncate text-sm" title={topic.name}>
                                                    <div className='text-pretty'>
                                                        {topic.name}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 flex-shrink-0">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent
                                                        align="end"
                                                        className="w-40"
                                                        style={{ zIndex: 1000 }}
                                                    >
                                                        <DropdownMenuItem
                                                            onClick={() => setEditingTopic({ id: topic.id, name: topic.name })}
                                                        >
                                                            <Edit2 className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => setTopicToDelete(topic.id)}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    {/* Add Topic Form */}
                    <div className="flex-none p-4 border-t dark:border-gray-800">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Add new topic"
                                value={newTopic}
                                onChange={(e) => setNewTopic(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="h-9"
                            />
                            <Button
                                size="sm"
                                onClick={handleCreateTopic}
                                disabled={!newTopic.trim()}
                                className="h-9 px-3"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="ml-[280px] flex-1 flex flex-col h-full">
                {/* Fixed Bank Details Header */}
                <div className="border-b dark:border-gray-800 bg-background p-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold">{bank?.name || 'Loading...'}</h2>
                                <p className="text-muted-foreground">{bank?.description}</p>
                            </div>
                            {selectedTopics.length > 0 && (
                                <Button onClick={() => setIsAddingQuestion(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Question
                                </Button>
                            )}
                        </div>
                        {selectedTopics.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedTopics.map(topic => (
                                    <Badge
                                        key={topic.id}
                                        variant="secondary"
                                        className="cursor-pointer"
                                        onClick={() => handleTopicClick(topic)}
                                    >
                                        {topic.name} ×
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1  p-6">
                    {selectedTopics.length > 0 ? (
                        <Tabs defaultValue="all" className="w-full">
                            <TabsList className="sticky bg-background">
                                <TabsTrigger value="all">All ({getFilteredQuestions('all').length})</TabsTrigger>
                                <TabsTrigger value="mcq">MCQ ({getFilteredQuestions('mcq').length})</TabsTrigger>
                                <TabsTrigger value="true_false">True/False ({getFilteredQuestions('true_false').length})</TabsTrigger>
                                <TabsTrigger value="fill_in_blank">Fill in Blank ({getFilteredQuestions('fill_in_blank').length})</TabsTrigger>
                                <TabsTrigger value="descriptive">Descriptive ({getFilteredQuestions('descriptive').length})</TabsTrigger>
                                <TabsTrigger value="coding">Coding ({getFilteredQuestions('coding').length})</TabsTrigger>
                            </TabsList>

                            <TabsContent value="all" className='overflow-auto'>
                                <QuestionsList
                                    questions={getFilteredQuestions('all')}
                                    onQuestionUpdate={handleQuestionUpdate}
                                    bankId={params.id}
                                    topic={selectedTopics.map(t => t.id)}
                                    onEdit={handleEditQuestion}
                                    allTopics={allTopics}
                                    editingQuestion={editingQuestion}
                                />
                            </TabsContent>
                            <TabsContent value="mcq">
                                <QuestionsList
                                    questions={getFilteredQuestions('mcq')}
                                    onQuestionUpdate={fetchQuestions}
                                    bankId={params.id}
                                    topic={selectedTopics.map(t => t.id)}
                                    onEdit={handleEditQuestion}
                                    allTopics={allTopics}
                                    editingQuestion={editingQuestion}
                                />
                            </TabsContent>
                            <TabsContent value="true_false">
                                <QuestionsList
                                    questions={getFilteredQuestions('true_false')}
                                    onQuestionUpdate={fetchQuestions}
                                    bankId={params.id}
                                    topic={selectedTopics.map(t => t.id)}
                                    onEdit={handleEditQuestion}
                                    allTopics={allTopics}
                                    editingQuestion={editingQuestion}
                                />
                            </TabsContent>
                            <TabsContent value="fill_in_blank">
                                <QuestionsList
                                    questions={getFilteredQuestions('fill_in_blank')}
                                    onQuestionUpdate={fetchQuestions}
                                    bankId={params.id}
                                    topic={selectedTopics.map(t => t.id)}
                                    onEdit={handleEditQuestion}
                                    allTopics={allTopics}
                                    editingQuestion={editingQuestion}
                                />
                            </TabsContent>
                            <TabsContent value="descriptive">
                                <QuestionsList
                                    questions={getFilteredQuestions('descriptive')}
                                    onQuestionUpdate={fetchQuestions}
                                    bankId={params.id}
                                    topic={selectedTopics.map(t => t.id)}
                                    onEdit={handleEditQuestion}
                                    allTopics={allTopics}
                                    editingQuestion={editingQuestion}
                                />
                            </TabsContent>
                            <TabsContent value="coding">
                                <QuestionsList
                                    questions={getFilteredQuestions('coding')}
                                    onQuestionUpdate={fetchQuestions}
                                    bankId={params.id}
                                    topic={selectedTopics.map(t => t.id)}
                                    onEdit={handleEditQuestion}
                                    allTopics={allTopics}
                                    editingQuestion={editingQuestion}
                                />
                            </TabsContent>
                        </Tabs>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Select one or more topics to view questions
                        </div>
                    )}
                </div>
            </div>

            {/* Sheets and Dialogs remain the same */}
            {(isAddingQuestion || editingQuestion) && (
                <Sheet 
                    open={true} 
                    onOpenChange={(open) => {
                        if (!open) {
                            setIsAddingQuestion(false);
                            setEditingQuestion(null);
                        }
                    }}
                >
                    <SheetContent
                        side="right"
                        className="w-[1200px] sm:max-w-[1200px] overflow-y-auto"
                        onInteractOutside={(e) => {
                            // Prevent closing when interacting with elements outside the sheet
                            e.preventDefault();
                        }}
                    >
                        <SheetHeader className="bg-background pb-4">
                            <SheetTitle>{editingQuestion ? 'Edit Question' : 'Add Question'}</SheetTitle>
                        </SheetHeader>
                        <div className="pt-2">
                            <QuestionForm
                                key={editingQuestion?._id || 'new'} // Add a key to force re-render
                                topics={topics}
                                bankId={params.id}
                                onCancel={() => {
                                    setIsAddingQuestion(false);
                                    setEditingQuestion(null);
                                }}
                                selectedTopicIds={selectedTopics.map((topic) => topic.id)}
                                onSave={async (questionData) => {
                                    await handleSaveQuestion(questionData);
                                    // Refresh questions immediately after save
                                    if (selectedTopics.length > 0) {
                                        await fetchQuestions(selectedTopics);
                                    }
                                }}
                                editingQuestion={editingQuestion}
                            />
                        </div>
                    </SheetContent>
                </Sheet>
            )}

            <AlertDialog open={!!topicToDelete} onOpenChange={() => setTopicToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the topic
                            and remove it from associated questions.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => topicToDelete && handleDeleteTopic(topicToDelete)}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default QuestionsPage;