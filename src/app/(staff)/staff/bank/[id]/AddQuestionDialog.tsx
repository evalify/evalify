import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DifficultyLevel, Question, QuestionType } from "@/types/questions";
import { Plus, Trash2, ListChecks, ToggleLeft, Type, FileText, Code } from "lucide-react";
import { useToast } from "@/components/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";

interface AddQuestionDialogProps {
    topic: string[];
    bankId: string;
    open: boolean;
    onClose: () => void;
    onQuestionAdded: () => void;
    editingQuestion?: Question | null;
}

export default function AddQuestionDialog({
    topic,
    bankId,
    open,
    onClose,
    onQuestionAdded,
    editingQuestion
}: AddQuestionDialogProps) {
    const { toast } = useToast();
    const [type, setType] = useState<QuestionType>("MCQ");
    const [content, setContent] = useState("");
    const [difficulty, setDifficulty] = useState<DifficultyLevel>("MEDIUM");
    const [marks, setMarks] = useState("1");
    const [explanation, setExplanation] = useState("");

    // MCQ specific state
    const [options, setOptions] = useState<string[]>([""]);
    const [correctOptions, setCorrectOptions] = useState<number[]>([]);

    // Fill in blank specific state
    const [correctAnswer, setCorrectAnswer] = useState("");

    // Descriptive specific state
    const [sampleAnswer, setSampleAnswer] = useState("");

    // Coding specific state
    const [testCases, setTestCases] = useState<{ input: string; output: string; }[]>([
        { input: "", output: "" }
    ]);

    const questionTypes = [
        { value: 'MCQ', label: 'Multiple Choice', icon: ListChecks, description: 'Create questions with multiple options' },
        { value: 'TRUE_FALSE', label: 'True/False', icon: ToggleLeft, description: 'Simple true or false questions' },
        { value: 'FILL_IN_BLANK', label: 'Fill in Blank', icon: Type, description: 'Questions with a single correct answer' },
        { value: 'DESCRIPTIVE', label: 'Descriptive', icon: FileText, description: 'Long form answers with sample response' },
        { value: 'CODING', label: 'Coding', icon: Code, description: 'Programming questions with test cases' }
    ];

    const difficultyLevels = [
        { value: 'EASY', label: 'Easy', badge: 'secondary', description: 'Basic level questions' },
        { value: 'MEDIUM', label: 'Medium', badge: 'default', description: 'Intermediate complexity' },
        { value: 'HARD', label: 'Hard', badge: 'destructive', description: 'Advanced level questions' }
    ];

    useEffect(() => {
        if (editingQuestion) {
            setType(editingQuestion.type);
            setContent(editingQuestion.content);
            setDifficulty(editingQuestion.difficulty);
            setMarks(editingQuestion.marks.toString());
            setExplanation(editingQuestion.explanation || '');

            switch (editingQuestion.type) {
                case 'MCQ':
                    setOptions(editingQuestion.options);
                    setCorrectOptions(editingQuestion.correctOptions);
                    break;
                case 'FILL_IN_BLANK':
                    setCorrectAnswer(editingQuestion.correctAnswer);
                    break;
                case 'DESCRIPTIVE':
                    setSampleAnswer(editingQuestion.sampleAnswer || '');
                    break;
                case 'CODING':
                    setTestCases(editingQuestion.testCases || [{ input: '', output: '' }]);
                    break;
            }
        }
    }, [editingQuestion]);

    useEffect(() => {
        // Initialize TRUE_FALSE options
        if (type === 'TRUE_FALSE') {
            setOptions(['True', 'False']);
            setCorrectOptions([]); // Reset correct options when switching to TRUE/FALSE
        }
    }, [type]);

    const validateForm = () => {
        if (!content.trim()) {
            toast({ title: "Error", description: "Question content is required", variant: "destructive" });
            return false;
        }

        if (parseInt(marks) < 1) {
            toast({ title: "Error", description: "Marks must be greater than 0", variant: "destructive" });
            return false;
        }

        switch (type) {
            case "MCQ":
                if (options.some(opt => !opt.trim())) {
                    toast({ title: "Error", description: "All options must be filled", variant: "destructive" });
                    return false;
                }
                if (correctOptions.length === 0) {
                    toast({ title: "Error", description: "Select at least one correct option", variant: "destructive" });
                    return false;
                }
                break;
            case "TRUE_FALSE":
                // No validation needed for TRUE_FALSE as options are preset
                break;
            case "FILL_IN_BLANK":
                if (!correctAnswer.trim()) {
                    toast({ title: "Error", description: "Correct answer is required", variant: "destructive" });
                    return false;
                }
                break;
            case "CODING":
                if (testCases.length === 0 || testCases.some(tc => !tc.input.trim() || !tc.output.trim())) {
                    toast({ title: "Error", description: "All test cases must be filled", variant: "destructive" });
                    return false;
                }
                break;
        }

        return true;
    };

    const handleOptionSelect = (index: number, checked: boolean) => {
        if (type === 'TRUE_FALSE') {
            // For True/False, only allow one selection
            setCorrectOptions(checked ? [index] : []);
        } else {
            // For regular MCQ, allow multiple selections
            setCorrectOptions(prev =>
                checked
                    ? [...prev, index]
                    : prev.filter(i => i !== index)
            );
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        const baseQuestion = {
            type,
            content,
            difficulty,
            marks: parseInt(marks),
            topics: topic,
            bankId,
            explanation: explanation.trim() || undefined,
        };

        let questionData;
        switch (type) {
            case "MCQ":
            case "TRUE_FALSE":  // Handle TRUE_FALSE the same way as MCQ
                questionData = {
                    ...baseQuestion,
                    options,
                    correctOptions: type === "TRUE_FALSE" && correctOptions.length === 0
                        ? [0]  // Default to "True" if nothing selected
                        : correctOptions,
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

            if (editingQuestion && !questionId) {
                throw new Error('Invalid question ID');
            }

            const url = editingQuestion
                ? `/api/staff/bank/${bankId}/questions/${questionId}`
                : `/api/staff/bank/${bankId}/questions`;

            // Send the question data directly without trying to remove _id
            const response = await fetch(url, {
                method: editingQuestion ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(questionData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Operation failed');
            }

            toast({
                title: "Success",
                description: editingQuestion ? "Question updated successfully" : "Question added successfully"
            });
            onQuestionAdded();
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Operation failed",
                variant: "destructive"
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">
                        {editingQuestion ? "Edit Question" : "Add New Question"}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-8 py-4">
                    {/* Question Type Selection */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label className="text-lg">Question Type</Label>
                            {editingQuestion && (
                                <Badge variant="outline">{type}</Badge>
                            )}
                        </div>
                        {!editingQuestion && (
                            <RadioGroup
                                value={type}
                                onValueChange={(value: QuestionType) => setType(value)}
                                className="grid grid-cols-3 gap-4"
                            >
                                {questionTypes.map(qType => (
                                    <div key={qType.value} className="relative">
                                        <RadioGroupItem
                                            value={qType.value}
                                            id={qType.value}
                                            className="peer sr-only"
                                        />
                                        <Label
                                            htmlFor={qType.value}
                                            className="flex flex-col gap-2 rounded-lg border p-4 hover:bg-muted [&:has([data-state=checked])]:border-primary peer-focus-visible:ring-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <qType.icon className="h-5 w-5" />
                                                <span className="font-medium">{qType.label}</span>
                                            </div>
                                            <span className="text-sm text-muted-foreground">
                                                {qType.description}
                                            </span>
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        )}
                    </div>

                    <Separator />

                    {/* Question Details */}
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <Label className="text-lg">Question Content</Label>
                            <Textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Enter your question here..."
                                className="min-h-[150px] resize-none"
                            />
                            
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
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-4">
                                <Label className="text-lg">Settings</Label>
                                <div className="grid grid-cols-2 gap-4">
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
                                                {difficultyLevels.map(level => (
                                                    <SelectItem key={level.value} value={level.value}>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={level.badge as any}>
                                                                {level.label}
                                                            </Badge>
                                                            <span className="text-muted-foreground text-sm">
                                                                {level.description}
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
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

                            {/* Question Type Specific Fields */}
                            <div className="space-y-4">
                                <Label className="text-lg">Answer Format</Label>
                                {(type === "MCQ" || type === "TRUE_FALSE") && (
                                    <div className="space-y-4">
                                        <Label>{type === "TRUE_FALSE" ? "Select the correct answer" : "Options"}</Label>
                                        <div className="space-y-3">
                                            {options.map((option, index) => (
                                                <div key={index} className="flex gap-3 items-start">
                                                    <Checkbox
                                                        checked={correctOptions.includes(index)}
                                                        onCheckedChange={(checked) => handleOptionSelect(index, checked as boolean)}
                                                    />
                                                    <div className="flex-1">
                                                        <Input
                                                            value={option}
                                                            onChange={(e) => {
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
                                                    {type === "MCQ" && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setOptions(options.filter((_, i) => i !== index));
                                                                setCorrectOptions(prev =>
                                                                    prev.filter(i => i !== index)
                                                                        .map(i => i > index ? i - 1 : i)
                                                                );
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                            {type === "MCQ" && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setOptions([...options, ""])}
                                                    className="w-full"
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Add Option
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {type === "FILL_IN_BLANK" && (
                                    <div className="space-y-2">
                                        <Label>Correct Answer</Label>
                                        <Input
                                            value={correctAnswer}
                                            onChange={(e) => setCorrectAnswer(e.target.value)}
                                            placeholder="Enter the correct answer"
                                        />
                                    </div>
                                )}
                                {type === "DESCRIPTIVE" && (
                                    <div className="space-y-2">
                                        <Label>Sample Answer</Label>
                                        <Textarea
                                            value={sampleAnswer}
                                            onChange={(e) => setSampleAnswer(e.target.value)}
                                            placeholder="Enter a sample answer..."
                                            className="min-h-[100px]"
                                        />
                                    </div>
                                )}
                                {type === "CODING" && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label>Test Cases</Label>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setTestCases([...testCases, { input: "", output: "" }])}
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add Test Case
                                            </Button>
                                        </div>
                                        <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                                            {testCases.map((testCase, index) => (
                                                <div key={index} className="grid grid-cols-2 gap-2 group relative">
                                                    <Input
                                                        value={testCase.input}
                                                        onChange={(e) => {
                                                            const newTestCases = [...testCases];
                                                            newTestCases[index].input = e.target.value;
                                                            setTestCases(newTestCases);
                                                        }}
                                                        placeholder="Input"
                                                    />
                                                    <div className="flex gap-2">
                                                        <Input
                                                            value={testCase.output}
                                                            onChange={(e) => {
                                                                const newTestCases = [...testCases];
                                                                newTestCases[index].output = e.target.value;
                                                                setTestCases(newTestCases);
                                                            }}
                                                            placeholder="Expected Output"
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="opacity-0 group-hover:opacity-100"
                                                            onClick={() => {
                                                                setTestCases(testCases.filter((_, i) => i !== index));
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                        {editingQuestion ? "Update Question" : "Add Question"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
