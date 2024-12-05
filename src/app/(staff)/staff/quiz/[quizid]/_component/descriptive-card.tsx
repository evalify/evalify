
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Question } from './types'
import 'katex/dist/katex.min.css'
import Latex from 'react-latex-next'

interface Props {
    question: Question
    onSave: (question: Question) => void
    onDelete: (id: string) => void
    isNew?: boolean
}

export function DescriptiveCard({ question, onSave, onDelete, isNew }: Props) {
    const [isEditing, setIsEditing] = useState(isNew)
    const [editedQuestion, setEditedQuestion] = useState(question)
    const [showPreview, setShowPreview] = useState(false)

    const handleSave = () => {
        onSave(editedQuestion)
        setIsEditing(false)
    }

    if (!isEditing) {
        return (
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <span className="mr-2 px-2 py-1 bg-slate-200 dark:text-black rounded-md">{editedQuestion.difficulty}</span>
                        <span className="px-2 py-1 bg-slate-200 dark:text-black rounded-md">{editedQuestion.marks} marks</span>
                    </div>
                    <div className="space-x-2">
                        <Button variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
                        <Button variant="destructive" onClick={() => onDelete(question._id!)}>Delete</Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2">Question:</h3>
                        <Latex>{editedQuestion.question}</Latex>
                    </div>
                    {editedQuestion.explanation && (
                        <div>
                            <h3 className="font-semibold mb-2">Explanation:</h3>
                            <Latex>{editedQuestion.explanation}</Latex>
                        </div>
                    )}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <div className="flex gap-4">
                    <Select
                        value={editedQuestion.difficulty}
                        onValueChange={(value: "easy" | "medium" | "hard") => 
                            setEditedQuestion({...editedQuestion, difficulty: value})}
                    >
                        <SelectTrigger>
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
                        placeholder="Marks"
                        value={editedQuestion.marks}
                        onChange={(e) => setEditedQuestion({...editedQuestion, marks: parseInt(e.target.value)})}
                        className="w-24"
                    />
                </div>

                <div>
                    <div className="flex justify-between mb-2">
                        <label className="font-semibold">Question:</label>
                        <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                            {showPreview ? 'Edit' : 'Preview'}
                        </Button>
                    </div>
                    {showPreview ? (
                        <div className="min-h-[100px] p-2 border rounded-md">
                            <Latex>{editedQuestion.question}</Latex>
                        </div>
                    ) : (
                        <Textarea
                            value={editedQuestion.question}
                            onChange={(e) => setEditedQuestion({...editedQuestion, question: e.target.value})}
                            placeholder="Enter question (LaTeX supported between $ symbols)"
                            className="min-h-[100px]"
                        />
                    )}
                </div>

                <div>
                    <div className="flex justify-between mb-2">
                        <label className="font-semibold">Explanation (optional):</label>
                        <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                            {showPreview ? 'Edit' : 'Preview'}
                        </Button>
                    </div>
                    {showPreview ? (
                        <div className="min-h-[100px] p-2 border rounded-md">
                            <Latex>{editedQuestion.explanation}</Latex>
                        </div>
                    ) : (
                        <Textarea
                            value={editedQuestion.explanation}
                            onChange={(e) => setEditedQuestion({...editedQuestion, explanation: e.target.value})}
                            placeholder="Enter explanation (optional, LaTeX supported between $ symbols)"
                            className="min-h-[100px]"
                        />
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => isNew ? onDelete(question._id!) : setIsEditing(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>Save</Button>
                </div>
            </CardContent>
        </Card>
    )
}