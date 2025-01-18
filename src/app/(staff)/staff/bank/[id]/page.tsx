"use client";

import React, { useEffect, useState } from 'react';
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
import QuestionsList from "./QuestionsList";
import QuestionForm from "./QuestionForm";
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

interface Topic {
    id: string;
    name: string;
}

const QuestionsPage = () => {
    const params = useParams();
    const [topics, setTopics] = useState<Topic[]>([]);
    const [newTopic, setNewTopic] = useState("");
    const [editingTopic, setEditingTopic] = useState<{ id: string, name: string } | null>(null);
    const [selectedTopics, setSelectedTopics] = useState<Topic[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isAddingQuestion, setIsAddingQuestion] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [allTopics, setAllTopics] = useState<string[]>([]);
    const [topicToDelete, setTopicToDelete] = useState<string | null>(null);

    useEffect(() => {
        fetchTopics();
    }, []);

    useEffect(() => {
        if (selectedTopics.length > 0) {
            fetchQuestions(selectedTopics);
        } else {
            setQuestions([]);
        }
    }, [selectedTopics]);

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

    return (
        <>
            <div className="grid grid-cols-[280px_1fr] h-[88vh]">
                <div className="border-r dark:border-gray-800 h-full sticky top-0">
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="flex-none p-4 border-b dark:border-gray-800">
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
                                            "relative" // Add this
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
                                                <span className="flex-1 truncate mr-2">
                                                    {topic.name}
                                                </span>
                                                <div className="opacity-0 group-hover:opacity-100">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
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
                
                <div className="p-6">
                    {selectedTopics.length > 0 ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold">Questions</h2>
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
                                </div>
                                <Button onClick={() => setIsAddingQuestion(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Question
                                </Button>
                            </div>

                            {isAddingQuestion && (
                                <QuestionForm
                                    topics={topics}  // Pass the full topics array with id and name
                                    bankId={params.id}
                                    onCancel={() => {
                                        setIsAddingQuestion(false);
                                        setEditingQuestion(null);
                                    }}
                                    onSave={() => {
                                        setIsAddingQuestion(false);
                                        setEditingQuestion(null);
                                        fetchQuestions(selectedTopics);
                                    }}
                                    editingQuestion={editingQuestion}
                                    allTopics={selectedTopics.map(t => t.name)} // Update this to pass only selected topic names
                                    selectedTopicIds={selectedTopics.map(t => t.id)} // Add this prop
                                />
                            )}
                            <ScrollArea>

                                <Tabs defaultValue="all" className="w-full">
                                    <TabsList>
                                        <TabsTrigger value="all">All ({getFilteredQuestions('all').length})</TabsTrigger>
                                        <TabsTrigger value="mcq">MCQ ({getFilteredQuestions('mcq').length})</TabsTrigger>
                                        <TabsTrigger value="true_false">True/False ({getFilteredQuestions('true_false').length})</TabsTrigger>
                                        <TabsTrigger value="fill_in_blank">Fill in Blank ({getFilteredQuestions('fill_in_blank').length})</TabsTrigger>
                                        <TabsTrigger value="descriptive">Descriptive ({getFilteredQuestions('descriptive').length})</TabsTrigger>
                                        <TabsTrigger value="coding">Coding ({getFilteredQuestions('coding').length})</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="all">
                                        <QuestionsList
                                            questions={getFilteredQuestions('all')}
                                            onQuestionUpdate={handleQuestionUpdate}
                                            bankId={params.id}
                                            topic={selectedTopics.map(t => t.id)}
                                            onEdit={handleEditQuestion}
                                            allTopics={allTopics}
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
                                        />
                                    </TabsContent>
                                </Tabs>
                            </ScrollArea>

                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Select one or more topics to view questions
                        </div>
                    )}
                </div>
            </div>

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
        </>
    );
};

export default QuestionsPage;