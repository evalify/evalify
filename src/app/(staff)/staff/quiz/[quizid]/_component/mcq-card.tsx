'use client'

import { useState, useEffect } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { Eye } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { LatexPreview } from '@/components/latex-preview'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit2, Trash2, CheckCircle2, Save, Plus, X } from 'lucide-react'
import { toast } from '@/components/hooks/use-toast'

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Option {
    option: string;
    optionId: string;
}

export interface Question {
    _id?: string;
    type: string;
    difficulty: Difficulty;
    marks: number;
    question: string;
    explanation: string;
    options: Option[];
    answer: string[];
}

export const defaultQuestion: Question = {
    type: 'MCQ',
    difficulty: 'easy',
    marks: 1,
    question: '',
    explanation: '',
    options: [
        { option: '', optionId: '1' },
        { option: '', optionId: '2' },
        { option: '', optionId: '3' },
        { option: '', optionId: '4' }
    ],
    answer: []
};

// Modify PreviewCard to preserve line breaks
function PreviewCard({ question }: { question: Question }) {
    return (
        <div className="w-[400px] rounded-lg shadow-lg p-4 border">
            <div className="mb-4 whitespace-pre-wrap">
                <LatexPreview content={question.question} />
            </div>
            <div className="space-y-2">
                {question.options.map((opt, idx) => (
                    <div
                        key={idx}
                        className={`p-2 rounded ${question.answer.includes(opt.optionId)
                                ? "bg-green-100 border-green-500 border  dark:bg-green-800"
                                : ""
                            }`}
                    >
                        <LatexPreview content={opt.option} />
                    </div>
                ))}
            </div>
        </div>
    )
}

interface MCQCardProps {
    question?: Question
    onSave: (question: Question) => void
    onDelete?: (questionId: string) => void
    isNew?: boolean
}

export function MCQCard({ question, onSave, onDelete, isNew = false }: MCQCardProps) {
    const [isEditing, setIsEditing] = useState(isNew)
    const [editedQuestion, setEditedQuestion] = useState<Question>(question || defaultQuestion)

    useEffect(() => {
        if (question) {
            setEditedQuestion(question)
        }
    }, [question])

    const handleEdit = () => setIsEditing(true)

    const handleSave = () => {
        if (!editedQuestion.question || !editedQuestion.type || !editedQuestion.difficulty) {
            toast({
                title: 'Error',
                description: 'Please fill in all required fields',
                variant: 'destructive'
            })
            return
        }

        onSave({
            ...editedQuestion,
            _id: editedQuestion._id || `new-${Date.now()}`
        })
        setIsEditing(false)
    }

    const handleInputChange = (field: keyof Question, value: any) => {
        setEditedQuestion(prev => ({ ...prev, [field]: value }))
    }

    const handleOptionChange = (index: number, value: string) => {
        setEditedQuestion(prev => ({
            ...prev,
            options: prev.options.map((o, i) => i === index ? { ...o, option: value } : o)
        }))
    }

    const addOption = () => {
        setEditedQuestion(prev => ({
            ...prev,
            options: [...prev.options, { option: '', optionId: Date.now().toString() }]
        }))
    }

    const toggleAnswer = (optionId: string) => {
        setEditedQuestion(prev => ({
            ...prev,
            answer: prev.answer.includes(optionId)
                ? prev.answer.filter(id => id !== optionId)
                : [...prev.answer, optionId]
        }))
    }

    const removeOption = (index: number) => {
        setEditedQuestion(prev => ({
            ...prev,
            options: prev.options.filter((_, i) => i !== index)
        }))
    }

    return (
        <Card className="w-full  mx-auto">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="flex-1">
                        {isEditing ? (
                            <div className="space-y-2">
                                <TextareaAutosize
                                    value={editedQuestion.question}
                                    onChange={(e) => handleInputChange('question', e.target.value)}
                                    className="w-full text-xl font-semibold resize-none overflow-hidden border rounded-md p-2 whitespace-pre-wrap"
                                    placeholder="Enter your question here (Use $ for LaTeX, e.g. $x^2$)"
                                    minRows={2}
                                />
                                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    Preview: <LatexPreview content={editedQuestion.question} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-2 justify-between">
                                <div className="whitespace-pre-wrap">
                                    <LatexPreview content={editedQuestion.question || 'New Question'} />
                                </div>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="p-0">
                                            <PreviewCard question={editedQuestion} />
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        )}
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    {isEditing ? (
                        <>
                            <Select
                                value={editedQuestion.type}
                                onValueChange={(value) => handleInputChange('type', value)}
                            >
                                <SelectTrigger className="w-[100px]">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MCQ">MCQ</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={editedQuestion.difficulty}
                                onValueChange={(value) => handleInputChange('difficulty', value as 'easy' | 'medium' | 'hard')}
                            >
                                <SelectTrigger className="w-[100px]">
                                    <SelectValue placeholder="Difficulty" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="easy">Easy</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input
                                type="number"
                                value={editedQuestion.marks}
                                onChange={(e) => handleInputChange('marks', parseInt(e.target.value))}
                                className="w-[80px]"
                                placeholder="Marks"
                            />
                        </>
                    ) : (
                        <>
                            <Badge variant="secondary">{editedQuestion.type}</Badge>
                            <Badge variant="outline">{editedQuestion.difficulty}</Badge>
                            <Badge>{editedQuestion.marks} {editedQuestion.marks === 1 ? 'mark' : 'marks'}</Badge>
                        </>
                    )}
                </div>

                <Separator />

                <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Options:</h4>
                    {editedQuestion.options.map((o, i) => (
                        <div key={i} className="flex items-center gap-2">
                            {isEditing ? (
                                <div className='flex flex-row gap-2'>
                                    <div className="flex-grow space-y-1">
                                        <TextareaAutosize
                                            value={o.option}
                                            onChange={(e) => handleOptionChange(i, e.target.value)}
                                            className={`w-[80vw] min-h-[38px] p-2 rounded-md border whitespace-pre-wrap ${editedQuestion.answer.includes(o.optionId) ? "border-green-500" : ""
                                                }`}
                                            placeholder={`Option ${i + 1} (Use $ for LaTeX, e.g. $x^2$)`}
                                            minRows={1}
                                        />
                                        <div className="text-sm text-muted-foreground">
                                            Preview: <LatexPreview content={o.option} />
                                        </div>
                                    </div>
                                    <Button
                                        variant={editedQuestion.answer.includes(o.optionId) ? "secondary" : "outline"}
                                        size="icon"
                                        onClick={() => toggleAnswer(o.optionId)}
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => removeOption(i)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className={`flex-grow p-2 rounded flex justify-between items-center ${editedQuestion.answer.includes(o.optionId) ? "border-2 rounded-xl border-green-500" : "border-slate-400 text-pretty"}`}>
                                    <LatexPreview content={o.option} />
                                    {
                                        editedQuestion.answer.includes(o.optionId) && (
                                            <CheckCircle2 className="h-4 w-4 text-green-500 inline-block mr-6" />
                                        )
                                    }
                                </div>
                            )}
                        </div>
                    ))}
                    {isEditing && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={addOption}
                            className="w-full"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Option
                        </Button>
                    )}
                </div>

                <Separator />

                <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Explanation:</h4>
                    {isEditing ? (
                        <Textarea
                            value={editedQuestion.explanation}
                            onChange={(e) => handleInputChange('explanation', e.target.value)}
                            className="text-sm"
                            placeholder="Provide an explanation for the correct answer"
                        />
                    ) : (
                        <p className="text-sm">{editedQuestion.explanation || 'No explanation provided.'}</p>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                {isEditing ? (
                    <Button variant="outline" onClick={handleSave}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                    </Button>
                ) : (
                    <Button variant="outline" onClick={handleEdit}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                    </Button>
                )}
                {!isNew && onDelete && (
                    <Button variant="destructive" onClick={() => onDelete(editedQuestion._id!)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}

