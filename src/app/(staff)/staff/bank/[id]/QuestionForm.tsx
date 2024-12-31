import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/hooks/use-toast";
import { Code, FileText, ListChecks, ToggleLeft, Type } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Question, QuestionType, DifficultyLevel } from "@/types/questions";
import { Checkbox } from "@radix-ui/react-checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@radix-ui/react-select";
import { Input } from "@/components/ui/input";
import { Button } from "react-day-picker";
import { Label } from "recharts";
import { MultiSelect } from "@/components/ui/multi-select";
import { RichTextEditor } from '@/components/ui/rich-text-editor';

interface QuestionFormProps {
    topic: string[]; // Changed from string to string[]
    bankId: string;
    onCancel: () => void;
    onSave: () => void;
    editingQuestion?: Question | null;
    allTopics?: string[]; // Make it optional
}

export default function QuestionForm({
    topic,
    bankId,
    onCancel,
    onSave,
    editingQuestion,
    allTopics = [] // Provide default empty array
}: QuestionFormProps) {
    const { toast } = useToast();
    const [type, setType] = useState<QuestionType>("MCQ");
    const [content, setContent] = useState("");
    const [difficulty, setDifficulty] = useState<DifficultyLevel>("MEDIUM");
    const [marks, setMarks] = useState("1");
    const [selectedTopics, setSelectedTopics] = useState<string[]>(() => {
        if (editingQuestion?.topics) {
            return editingQuestion.topics;
        }
        return topic; // Use topic array directly
    });
    const [explanation, setExplanation] = useState(editingQuestion?.explanation || "");

    // Initialize MCQ with 4 empty options
    const [options, setOptions] = useState<string[]>(Array(4).fill(""));
    const [correctOptions, setCorrectOptions] = useState<number[]>([]);

    // Question type metadata
    const questionTypes = [
        { value: 'MCQ', label: 'Multiple Choice', icon: ListChecks },
        { value: 'TRUE_FALSE', label: 'True/False', icon: ToggleLeft },
        { value: 'FILL_IN_BLANK', label: 'Fill in Blank', icon: Type },
        { value: 'DESCRIPTIVE', label: 'Descriptive', icon: FileText },
        { value: 'CODING', label: 'Coding', icon: Code }
    ];

    useEffect(() => {
        if (editingQuestion) {
            setSelectedTopics(editingQuestion.topics || topic.filter(Boolean));
            setExplanation(editingQuestion.explanation || "");
        }
    }, [editingQuestion, topic]);

    const handleSubmit = async () => {
        if (!validateForm()) return;

        // Use the selectedTopics array directly
        const processedTopics = Array.from(new Set(
            selectedTopics.filter(t => t && t.trim().length > 0)
        ));

        const baseQuestion = {
            type,
            content,
            difficulty,
            marks: parseInt(marks),
            topics: topic, // Use processed topics array
            bankId,
            explanation: explanation.trim() || undefined, // Only include if not empty
        };

        let questionData;
        switch (type) {
            case "MCQ":
            case "TRUE_FALSE":
                questionData = {
                    ...baseQuestion,
                    options,
                    correctOptions,
                };
                break;
            case "FILL_IN_BLANK":
                questionData = {
                    ...baseQuestion,
                    correctAnswer,
                };
                break;
            case "DESCRIPTIVE":
                questionData = {
                    ...baseQuestion,
                    sampleAnswer,
                };
                break;
            case "CODING":
                questionData = {
                    ...baseQuestion,
                    testCases,
                };
                break;
        }

        try {
            const questionId = editingQuestion?._id || editingQuestion?.id;
            
            if (!questionId && editingQuestion) {
                throw new Error('Invalid question ID');
            }
            
            const url = editingQuestion
                ? `/api/staff/bank/${bankId}/questions/${questionId}`
                : `/api/staff/bank/${bankId}/questions`;

            // Remove _id from the request body for both POST and PATCH
            const { _id, ...submitData } = questionData;

            const response = await fetch(url, {
                method: editingQuestion ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(submitData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Operation failed');
            }

            toast({
                title: "Success",
                description: editingQuestion ? "Question updated successfully" : "Question added successfully"
            });
            onSave();
        } catch (error) {
            toast({ 
                title: "Error", 
                description: error instanceof Error ? error.message : "Operation failed", 
                variant: "destructive" 
            });
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl">
                    {editingQuestion ? "Edit Question" : "Add New Question"}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                    {/* Question Type Selection */}
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            {questionTypes.map(qType => (
                                <Button
                                    key={qType.value}
                                    variant={type === qType.value ? "default" : "outline"}
                                    className="flex-1"
                                    onClick={() => !editingQuestion && setType(qType.value as QuestionType)}
                                    disabled={!!editingQuestion}
                                >
                                    <qType.icon className="h-4 w-4 mr-2" />
                                    {qType.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Question Content and Settings */}
                    <div className="grid grid-cols-3 gap-6">
                        <div className="col-span-2 space-y-4">
                            <div className="space-y-2">
                                <Label>Question Content</Label>
                                <RichTextEditor
                                    content={content}
                                    onChange={setContent}
                                    placeholder="Enter your question here..."
                                />
                            </div>

                            {/* Add Explanation field */}
                            <div className="space-y-2">
                                <Label>Explanation (Optional)</Label>
                                <Textarea
                                    value={explanation}
                                    onChange={(e) => setExplanation(e.target.value)}
                                    placeholder="Enter an explanation for this question..."
                                    className="min-h-[80px]"
                                />
                            </div>

                            {/* Question Type Specific Fields */}
                            {(type === "MCQ" || type === "TRUE_FALSE") && (
                                <div className="space-y-4 pt-4">
                                    <Label>Options</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {options.map((option, index) => (
                                            <div key={index} className="flex items-start gap-2">
                                                <Checkbox
                                                    checked={correctOptions.includes(index)}
                                                    onCheckedChange={(checked) => {
                                                        if (type === 'TRUE_FALSE') {
                                                            setCorrectOptions(checked ? [index] : []);
                                                        } else {
                                                            setCorrectOptions(prev => 
                                                                checked 
                                                                    ? [...prev, index]
                                                                    : prev.filter(i => i !== index)
                                                            );
                                                        }
                                                    }}
                                                    className="mt-2"
                                                />
                                                <div className="flex-1">
                                                    <Input
                                                        value={option}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                            if (type !== "TRUE_FALSE") {
                                                                const newOptions = [...options];
                                                                newOptions[index] = e.target.value;
                                                                setOptions(newOptions);
                                                            }
                                                        }}
                                                        placeholder={`Option ${index + 1}`}
                                                        disabled={type === "TRUE_FALSE"}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ...other question type fields... */}
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-4">
                                <Label>Settings</Label>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Difficulty</Label>
                                        <Select 
                                            value={difficulty} 
                                            onValueChange={(value: DifficultyLevel) => setDifficulty(value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="EASY">Easy</SelectItem>
                                                <SelectItem value="MEDIUM">Medium</SelectItem>
                                                <SelectItem value="HARD">Hard</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Marks</Label>
                                        <Input
                                            type="number"
                                            value={marks}
                                            onChange={(e) => setMarks(e.target.value)}
                                            min="1"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="grid w-full gap-1.5">
                                <Label>Topics</Label>
                                <MultiSelect
                                    options={[...new Set([...allTopics, ...topic])].map(t => ({ value: t, label: t }))}
                                    value={selectedTopics.map(t => ({ value: t, label: t }))}
                                    onChange={(selected) => setSelectedTopics(selected.map(s => s.value))}
                                    placeholder="Select topics..."
                                    required // Add required attribute
                                />
                                {selectedTopics.length === 0 && (
                                    <p className="text-sm text-destructive">At least one topic is required</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                        {editingQuestion ? "Update Question" : "Add Question"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
