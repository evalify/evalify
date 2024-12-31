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
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Question } from "@/types/questions";
import QuestionsList from "./QuestionsList";
import AddQuestionDialog from "./AddQuestionDialog";
import QuestionForm from "./QuestionForm";
import { Badge } from '@/components/ui/badge';

interface Topic {
    name: string;
}

const QuestionsPage = () => {
    const params = useParams();
    const [topics, setTopics] = useState<Topic[]>([]);
    const [newTopic, setNewTopic] = useState("");
    const [editingTopic, setEditingTopic] = useState<{ index: number, name: string } | null>(null);
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isAddingQuestion, setIsAddingQuestion] = useState(false); 
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [allTopics, setAllTopics] = useState<string[]>([]);

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

            const topicsArray = (data.topics || []).map((topic: string) => topic);
            setTopics((data.topics || []).map((topic: string) => ({ name: topic })));
            setAllTopics(topicsArray); 
        } catch (error) {
            console.error('Error fetching topics:', error);
            setTopics([]);
            setAllTopics([]);
        }
    };

    const fetchQuestions = async (topics: string[]) => {
        try {
            const topicsParam = topics.join(',');
            const response = await fetch(`/api/staff/bank/${params.id}/questions?topic=${topicsParam}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            const data = await response.json();
            console.log('Fetched questions:', data); 
            setQuestions(Array.isArray(data.questions) ? data.questions : []);
        } catch (error) {
            console.error('Error fetching questions:', error);
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

    const handleUpdateTopic = async (index: number) => {
        if (!editingTopic?.name.trim()) {
            setEditingTopic(null);
            return;
        }

        const response = await fetch(`/api/staff/bank/${params.id}/topics`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ index, name: editingTopic.name.trim() }),
        });
        if (response.ok) {
            setEditingTopic(null);
            fetchTopics();
        }
    };

    const handleDeleteTopic = async (index: number) => {
        const response = await fetch(`/api/staff/bank/${params.id}/topics`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ index }),
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

    const handleTopicClick = (topicName: string) => {
        const isSelected = selectedTopics.includes(topicName);
        let newSelectedTopics: string[];

        if (isSelected) {
            newSelectedTopics = selectedTopics.filter(t => t !== topicName);
        } else {
            newSelectedTopics = [...selectedTopics, topicName];
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
        <div className="grid grid-cols-[280px_1fr] h-[88vh] ">
            <div className="border-r dark:border-gray-800">
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex-none p-4 border-b dark:border-gray-800">
                        <h2 className="font-semibold text-lg">Topics</h2>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1 h-[50vh]">
                            {topics.map((topic, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "group flex items-center justify-between p-2",
                                        "rounded-md transition-colors",
                                        "hover:bg-muted",
                                        selectedTopics.includes(topic.name) && "bg-muted",
                                        editingTopic?.index === index && "bg-muted"
                                    )}
                                    onClick={() => handleTopicClick(topic.name)}
                                >
                                    {editingTopic?.index === index ? (
                                        <Input
                                            value={editingTopic.name}
                                            onChange={(e) =>
                                                setEditingTopic({ ...editingTopic, name: e.target.value })
                                            }
                                            onBlur={() => handleUpdateTopic(index)}
                                            className="h-8"
                                            autoFocus
                                        />
                                    ) : (
                                        <>
                                            <span className="flex-1 truncate pr-4">
                                                {topic.name}
                                            </span>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40">
                                                    <DropdownMenuItem
                                                        onClick={() => setEditingTopic({ index, name: topic.name })}
                                                    >
                                                        <Edit2 className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteTopic(index)}
                                                        className="text-destructive focus:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
                                            key={topic}
                                            variant="secondary"
                                            className="cursor-pointer"
                                            onClick={() => handleTopicClick(topic)}
                                        >
                                            {topic} ×
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
                                topic={selectedTopics} 
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
                                allTopics={allTopics} 
                            />
                        )}
                        <ScrollArea>

                            <Tabs defaultValue="all" className="w-full">
                                <TabsList>
                                    <TabsTrigger value="all">All</TabsTrigger>
                                    <TabsTrigger value="mcq">MCQ</TabsTrigger>
                                    <TabsTrigger value="true_false">True/False</TabsTrigger>
                                    <TabsTrigger value="fill_in_blank">Fill in Blank</TabsTrigger>
                                    <TabsTrigger value="descriptive">Descriptive</TabsTrigger>
                                    <TabsTrigger value="coding">Coding</TabsTrigger>
                                </TabsList>

                                <TabsContent value="all">
                                    <QuestionsList
                                        questions={getFilteredQuestions('all')}
                                        onQuestionUpdate={handleQuestionUpdate}
                                        bankId={params.id}
                                        topic={selectedTopics}
                                        onEdit={handleEditQuestion}
                                        allTopics={allTopics} 
                                    />
                                </TabsContent>
                                <TabsContent value="mcq">
                                    <QuestionsList
                                        questions={getFilteredQuestions('mcq')}
                                        onQuestionUpdate={fetchQuestions}
                                        bankId={params.id}
                                        topic={selectedTopics}
                                        onEdit={handleEditQuestion}
                                        allTopics={allTopics} 
                                    />
                                </TabsContent>
                                <TabsContent value="true_false">
                                    <QuestionsList
                                        questions={getFilteredQuestions('true_false')}
                                        onQuestionUpdate={fetchQuestions}
                                        bankId={params.id}
                                        topic={selectedTopics} 
                                        onEdit={handleEditQuestion}
                                        allTopics={allTopics} 
                                    />
                                </TabsContent>
                                <TabsContent value="fill_in_blank">
                                    <QuestionsList
                                        questions={getFilteredQuestions('fill_in_blank')}
                                        onQuestionUpdate={fetchQuestions}
                                        bankId={params.id}
                                        topic={selectedTopics} 
                                        onEdit={handleEditQuestion}
                                        allTopics={allTopics} 
                                    />
                                </TabsContent>
                                <TabsContent value="descriptive">
                                    <QuestionsList
                                        questions={getFilteredQuestions('descriptive')}
                                        onQuestionUpdate={fetchQuestions}
                                        bankId={params.id}
                                        topic={selectedTopics} 
                                        onEdit={handleEditQuestion}
                                        allTopics={allTopics} 
                                    />
                                </TabsContent>
                                <TabsContent value="coding">
                                    <QuestionsList
                                        questions={getFilteredQuestions('coding')}
                                        onQuestionUpdate={fetchQuestions}
                                        bankId={params.id}
                                        topic={selectedTopics} 
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

                {isAddingQuestion && (
                    <AddQuestionDialog
                        topic={selectedTopics} 
                        bankId={params.id}
                        open={isAddingQuestion}
                        onClose={() => {
                            setIsAddingQuestion(false);
                            setEditingQuestion(null);
                        }}
                        onQuestionAdded={() => {
                            setIsAddingQuestion(false);
                            setEditingQuestion(null);
                            fetchQuestions(selectedTopics);
                        }}
                        editingQuestion={editingQuestion}
                    />
                )}
            </div>
        </div>
    );
};

export default QuestionsPage;