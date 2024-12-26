'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Question } from './types'
import { Trash2, Check } from 'lucide-react'
import { StaffCodeEditor } from './staff-code-editor'
import { Dialog, DialogHeader, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';

interface Props {
    question: Question
    onSave: (question: Question) => void
    onDelete: (id: string) => void
    isNew?: boolean
}

function CodeCard({ question, onSave, onDelete, isNew }: Props) {
    const [isEditing, setIsEditing] = useState(isNew)
    const [editedQuestion, setEditedQuestion] = useState(question)
    const [testCaseErrors, setTestCaseErrors] = useState<{ [key: number]: string }>({})

    const handleSave = () => {
        // Validate all test cases before saving
        const errors: { [key: number]: string } = {}
        let hasErrors = false

        if ('testCases' in editedQuestion) {
            editedQuestion.testCases.forEach((testCase, index) => {
                if (!testCase.input || !testCase.expectedOutput) {
                    errors[index] = 'Both input and output are required'
                    hasErrors = true
                }
            })
        }

        setTestCaseErrors(errors)
        if (hasErrors) return

        onSave(editedQuestion)
        setIsEditing(false)
    }

    const addTestCase = () => {
        if ('testCases' in editedQuestion) {
            setEditedQuestion({
                ...editedQuestion,
                testCases: [...editedQuestion.testCases, { input: '', expectedOutput: '' }]
            })
        }
    }

    const removeTestCase = (index: number) => {
        if ('testCases' in editedQuestion) {
            setEditedQuestion({
                ...editedQuestion,
                testCases: editedQuestion.testCases.filter((_, i) => i !== index)
            })
        }
    }

    const updateTestCase = (index: number, field: 'input' | 'expectedOutput', value: string) => {
        if ('testCases' in editedQuestion) {
            const updatedTestCases = [...editedQuestion.testCases]
            updatedTestCases[index] = {
                ...updatedTestCases[index],
                [field]: value
            }
            setEditedQuestion({
                ...editedQuestion,
                testCases: updatedTestCases
            })
        }
    }

    const validateSingleTestCase = (index: number) => {
        const testCase = editedQuestion.testCases[index]
        const error = (!testCase.input || !testCase.expectedOutput)
            ? 'Both input and output are required'
            : ''

        setTestCaseErrors(prev => ({
            ...prev,
            [index]: error
        }))
        return !error
    }

    if (!isEditing) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <h3 className="font-semibold">Coding Question</h3>
                        <p className="text-sm text-gray-500">Function: {editedQuestion.functionName}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
                        <Button variant="destructive" onClick={() => onDelete(editedQuestion._id!)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>{editedQuestion.question}</p>
                    <div>
                        <p className="font-semibold">Language: {editedQuestion.language}</p>
                        <p className="font-semibold">Return Type: {editedQuestion.returnType}</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <h3 className="font-semibold">Coding Question</h3>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label>Question</label>
                    <Textarea
                        value={editedQuestion.question}
                        onChange={(e) => setEditedQuestion({ ...editedQuestion, question: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label>Function Name</label>
                        <Input
                            value={editedQuestion.functionName}
                            onChange={(e) => setEditedQuestion({ ...editedQuestion, functionName: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label>Programming Language</label>
                        <Select
                            value={editedQuestion.language}
                            onValueChange={(value) => setEditedQuestion({ ...editedQuestion, language: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="python">Python</SelectItem>
                                <SelectItem value="matlab">Matlab</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label>Test Cases</label>
                        <Button variant="outline" onClick={addTestCase}>Add Test Case</Button>
                    </div>
                    {'testCases' in editedQuestion && editedQuestion.testCases.map((testCase, index) => (
                        <div key={index} className="space-y-2 border p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm">Input</label>
                                    <Input
                                        value={testCase.input}
                                        onChange={(e) => {
                                            if (!('testCases' in editedQuestion)) return
                                            const newTestCases = [...editedQuestion.testCases]
                                            newTestCases[index] = {
                                                ...newTestCases[index],
                                                input: e.target.value
                                            }
                                            setEditedQuestion({ ...editedQuestion, testCases: newTestCases })
                                        }}
                                        placeholder="[1,2,3], 5"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm">Expected Output</label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={testCase.expectedOutput}
                                            onChange={(e) => {
                                                if (!('testCases' in editedQuestion)) return
                                                const newTestCases = [...editedQuestion.testCases]
                                                newTestCases[index] = {
                                                    ...newTestCases[index],
                                                    expectedOutput: e.target.value
                                                }
                                                setEditedQuestion({ ...editedQuestion, testCases: newTestCases })
                                            }}
                                            placeholder="8"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => validateSingleTestCase(index)}
                                            className={testCaseErrors[index] ? 'border-red-500' : 'border-green-500'}
                                        >
                                            <Check className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            {testCaseErrors[index] && (
                                <p className="text-sm text-red-500">{testCaseErrors[index]}</p>
                            )}
                            <div className="text-sm text-gray-500">
                                <p>Examples:</p>
                                <ul className="list-disc list-inside">
                                    <li>Input: 5 | Output: 25</li>
                                    <li>Input: [1,2,3] | Output: 6</li>
                                    <li>Input: [1,2], 3 | Output: 6</li>
                                </ul>
                            </div>
                            <Button
                                variant="destructive"
                                onClick={() => removeTestCase(index)}
                                className="w-full"
                            >
                                Remove Test Case
                            </Button>
                        </div>
                    ))}
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            Preview Code Template
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Code Template Preview</DialogTitle>
                        </DialogHeader>
                        <StaffCodeEditor
                            language={editedQuestion.language}
                            functionName={editedQuestion.functionName}
                            returnType={editedQuestion.returnType}
                            testCases={editedQuestion.testCases}
                        />
                    </DialogContent>
                </Dialog>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button onClick={handleSave}>Save</Button>
            </CardFooter>
        </Card>
    )
}

export default CodeCard