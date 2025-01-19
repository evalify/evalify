import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/hooks/use-toast";
import { Code, FileText, ListChecks, ToggleLeft, Type, Edit2, Plus, X, AlertTriangle, Check, ChevronDown, Sparkles, ImageIcon } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { Question, QuestionType, DifficultyLevel } from "@/types/questions";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CustomImage } from '@/components/ui/custom-image';
import { v4 as uuidv4 } from 'uuid';
import { LatexPreview } from '@/components/latex-preview';
import { ScrollArea } from "@/components/ui/scroll-area";

interface QuestionFormProps {
    topics: Array<{ id: string; name: string }>;
    bankId: string;
    onCancel: () => void;
    onSave: (question: Question) => Promise<void>; // Update to async
    editingQuestion?: Question | null;
    allTopics?: string[];
    selectedTopicIds?: string[]; // Add this prop
    requireTopics?: boolean;
    isQuiz?: boolean; // Add this prop
    quizId?: string; // Add this prop
}

interface OptionWithImage {
    optionId: string;
    option: string;
    image?: string;
}

export default function EnhancedQuestionForm({ 
    editingQuestion, 
    topics = [], // Add default value
    bankId = '', // Add default value
    onCancel, 
    onSave, 
    selectedTopicIds = [],
    requireTopics = true, // Add default value
    isQuiz = false, // Add default value
    quizId // Add this prop
}: QuestionFormProps) {
    const { toast } = useToast();
    const [type, setType] = useState<QuestionType>(editingQuestion?.type || "MCQ");
    const [content, setContent] = useState(editingQuestion?.content || editingQuestion?.question || "");
    const [difficulty, setDifficulty] = useState<DifficultyLevel>(editingQuestion?.difficulty || "MEDIUM");
    const [marks, setMarks] = useState(editingQuestion?.marks?.toString() || "1");
    const [selectedTopics, setSelectedTopics] = useState<string[]>(() => {
        if (editingQuestion?.topics) {
            return editingQuestion.topics;
        }
        return selectedTopicIds; // Use the selected topic IDs instead of empty array
    });
    const [explanation, setExplanation] = useState(editingQuestion?.explanation || "");
    const [correctAnswer, setCorrectAnswer] = useState(editingQuestion?.expectedAnswer || "");
    const [sampleAnswer, setSampleAnswer] = useState(editingQuestion?.expectedAnswer || "");
    const [testCases, setTestCases] = useState(editingQuestion?.testCases || "");
    const [guidelines, setGuidelines] = useState(editingQuestion?.guidelines || "");
    const [isGenerating, setIsGenerating] = useState(false);

    // Add helper for true/false options initialization
    const initializeOptions = () => {
        if (editingQuestion?.options) {
            return editingQuestion.options.map(opt => ({
                ...opt,
                optionId: opt.optionId || uuidv4().replace(/-/g, ''),
            }));
        }

        if (type === 'TRUE_FALSE') {
            return [
                { optionId: 'true-option', option: 'True' },
                { optionId: 'false-option', option: 'False' }
            ];
        }

        return Array(4).fill('').map(() => ({
            optionId: uuidv4().replace(/-/g, ''),
            option: ''
        }));
    };

    // Update correct options initialization to handle editing mode
    const initializeCorrectOptions = () => {
        if (editingQuestion?.answer) {
            const optionIds = editingQuestion.options?.map(opt => opt.optionId) || [];
            return editingQuestion.answer.map(answerId => 
                optionIds.findIndex(id => id === answerId)
            ).filter(index => index !== -1);
        }
        return [];
    };

    const [optionsWithIds, setOptionsWithIds] = useState<OptionWithImage[]>(initializeOptions);
    const [correctOptions, setCorrectOptions] = useState<number[]>(initializeCorrectOptions());

    const [selectedAnswer, setSelectedAnswer] = useState<string>(() => {
        if (editingQuestion?.type === 'TRUE_FALSE') {
            return editingQuestion.answer || '';
        }
        return '';
    });

    const handleTypeChange = (newType: QuestionType) => {
        if (!editingQuestion) {
            setType(newType);
            if (newType === 'TRUE_FALSE') {
                setOptionsWithIds([
                    { optionId: 'true-option', option: 'True' },
                    { optionId: 'false-option', option: 'False' }
                ]);
                setCorrectOptions([]);
            } else {
                setOptionsWithIds(Array(4).fill('').map(() => ({
                    optionId: uuidv4().replace(/-/g, ''),
                    option: ''
                })));
            }
        }
    };

    const generateGuidelines = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch('/api/ai/generate-guidelines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: content,
                    expectedAnswer: sampleAnswer
                }),
            });

            const data = await response.json();
            setGuidelines(data.guidelines);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to generate guidelines",
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const enhanceQuestion = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch('/api/ai/enhance-question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: content,
                    expectedAnswer: sampleAnswer
                }),
            });

            const data = await response.json();
            setContent(data.enhancedQuestion);
            setSampleAnswer(data.enhancedAnswer);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to enhance question",
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const questionTypes = [
        { value: 'MCQ', label: 'Multiple Choice', icon: ListChecks },
        { value: 'TRUE_FALSE', label: 'True/False', icon: ToggleLeft },
        { value: 'FILL_IN_BLANK', label: 'Fill in Blank', icon: Type },
        { value: 'DESCRIPTIVE', label: 'Descriptive', icon: FileText },
        // { value: 'CODING', label: 'Coding', icon: Code }
    ];

    const difficultyColors = {
        EASY: "bg-green-100 text-green-800",
        MEDIUM: "bg-yellow-100 text-yellow-800",
        HARD: "bg-red-100 text-red-800"
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            const questionData = {
                type,
                difficulty,
                marks: parseInt(marks),
                question: content,
                explanation: explanation.trim(),
                topics: selectedTopics,
                bankId,
                ...(type === 'MCQ' || type === 'TRUE_FALSE' ? {
                    options: optionsWithIds,
                    answer: correctOptions.map(index => optionsWithIds[index].optionId)
                } : {}),
                ...(type === 'DESCRIPTIVE' ? {
                    expectedAnswer: sampleAnswer,
                    guidelines: guidelines
                } : {}),
                ...(type === 'FILL_IN_BLANK' ? {
                    expectedAnswer: correctAnswer
                } : {}),
                ...(editingQuestion?._id ? { _id: editingQuestion._id } : {}),
                ...(editingQuestion?.id ? { id: editingQuestion.id } : {})
            };

            await onSave(questionData);
            toast({
                title: "Success",
                description: editingQuestion ? "Question updated successfully" : "Question added successfully",
            });
        } catch (error) {
            console.error('Error saving question:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to save question",
                variant: "destructive"
            });
        }
    };

    const topicMap = useMemo(() => {
        const map = new Map();
        topics.forEach(t => map.set(t.id, t.name));
        return map;
    }, [topics]);

    const handleAddTopic = (topicId: string) => {
        if (!selectedTopics.includes(topicId)) {
            setSelectedTopics([...selectedTopics, topicId]);
        }
    };

    const handleRemoveTopic = (topicId: string) => {
        setSelectedTopics(selectedTopics.filter(t => t !== topicId));
    };

    const availableTopics = useMemo(() =>
        topics.filter(topic => !selectedTopics.includes(topic.id)),
        [topics, selectedTopics]
    );

    const validateForm = () => {
        if (!content.trim()) {
            toast({
                title: "Validation Error",
                description: "Question content is required",
                variant: "destructive"
            });
            return false;
        }

        // Only validate topics if required
        if (requireTopics && selectedTopics.length === 0) {
            toast({
                title: "Validation Error",
                description: "At least one topic is required",
                variant: "destructive"
            });
            return false;
        }

        // Type-specific validation
        switch (type) {
            case "MCQ":
                if (optionsWithIds.some(opt => !opt.option.trim())) {
                    toast({
                        title: "Validation Error",
                        description: "All options must be filled",
                        variant: "destructive"
                    });
                    return false;
                }
                if (correctOptions.length === 0) {
                    toast({
                        title: "Validation Error",
                        description: "Please select at least one correct option",
                        variant: "destructive"
                    });
                    return false;
                }
                break;

            case "TRUE_FALSE":
                if (correctOptions.length !== 1) {
                    toast({
                        title: "Validation Error",
                        description: "Please select exactly one answer",
                        variant: "destructive"
                    });
                    return false;
                }
                break;

            case "FILL_IN_BLANK":
                if (!correctAnswer.trim()) {
                    toast({
                        title: "Validation Error",
                        description: "Please provide the correct answer",
                        variant: "destructive"
                    });
                    return false;
                }
                break;

            case "DESCRIPTIVE":
                if (!sampleAnswer.trim()) {
                    toast({
                        title: "Validation Error",
                        description: "Please provide an expected answer",
                        variant: "destructive"
                    });
                    return false;
                }
                break;
        }

        return true;
    };

    const handleOptionChange = (index: number, value: string) => {
        if (type !== "TRUE_FALSE") {
            const newOptions = [...optionsWithIds];
            newOptions[index] = {
                ...newOptions[index],
                option: value
            };
            setOptionsWithIds(newOptions);
        }
    };

    // Add image upload handler for options
    const handleOptionImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const { url } = await response.json();
            const newOptions = [...optionsWithIds];
            newOptions[index] = {
                ...newOptions[index],
                image: url
            };
            setOptionsWithIds(newOptions);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to upload image",
                variant: "destructive"
            });
        }
    };

    return (
        <ScrollArea className="h-full">
            <div className="space-y-8 px-2 pb-8">
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {questionTypes.map(qType => (
                        <TooltipProvider key={qType.value}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={type === qType.value ? "default" : "outline"}
                                        className={`flex-shrink-0 ${type === qType.value ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white' : ''}`}
                                        onClick={() => handleTypeChange(qType.value as QuestionType)}
                                        disabled={!!editingQuestion}
                                    >
                                        {qType.label}
                                        <qType.icon className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{qType.label}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-lg font-semibold">Question Content</Label>
                            <RichTextEditor
                                content={content}
                                onChange={setContent}
                                placeholder="Enter your question here..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-lg font-semibold">Explanation</Label>
                            <Textarea
                                value={explanation}
                                onChange={(e) => setExplanation(e.target.value)}
                                placeholder="Enter an explanation for this question..."
                                className="min-h-[100px]"
                            />
                        </div>

                        {(type === "MCQ" || type === "TRUE_FALSE") && (
                            <div className="space-y-4">
                                <Label className="text-lg font-semibold">
                                    {type === "TRUE_FALSE" ? "Select the correct answer" : "Options"}
                                </Label>
                                <div className={`grid ${type === "TRUE_FALSE" ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2"} gap-4`}>
                                    {optionsWithIds.map((option, index) => (
                                        <div key={option.optionId}
                                            className={`flex flex-col gap-2 ${type === "TRUE_FALSE"
                                                ? "justify-center p-4 hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer"
                                                : "bg-gray-50 dark:bg-gray-900 p-3"
                                                } rounded-md`}
                                        >
                                            <div className="flex items-center gap-2">
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
                                                />
                                                {type === "TRUE_FALSE" ? (
                                                    <span className="text-lg">{option.option}</span>
                                                ) : (
                                                    <div className="flex-1 space-y-2">
                                                        <Input
                                                            value={option.option}
                                                            onChange={(e) => handleOptionChange(index, e.target.value)}
                                                            placeholder={`Option ${index + 1}`}
                                                        />
                                                        <div className="text-sm text-muted-foreground p-2 bg-background rounded">
                                                            <LatexPreview content={option.option} />
                                                        </div>
                                                    </div>
                                                )}
                                                <Button variant="outline" className="relative overflow-hidden">
                                                    <input
                                                        type="file"
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                        accept="image/*"
                                                        onChange={(e) => handleOptionImageUpload(index, e)}
                                                    />
                                                    <ImageIcon className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            {option.image && (
                                                <CustomImage 
                                                    src={option.image} 
                                                    alt={`Option ${index + 1}`}
                                                    className="rounded"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {type === "FILL_IN_BLANK" && (
                            <div className="space-y-2">
                                <Label className="text-lg font-semibold">Correct Answer</Label>
                                <Input
                                    value={correctAnswer}
                                    onChange={(e) => setCorrectAnswer(e.target.value)}
                                    placeholder="Enter the correct answer"
                                />
                            </div>
                        )}

                        {type === "DESCRIPTIVE" && (
                            <div className="space-y-4">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={enhanceQuestion}
                                        disabled={isGenerating || true}
                                    >
                                        <Sparkles />
                                        {isGenerating ? "Enhancing..." : "Enhance Question & Answer"}
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-lg font-semibold">Expected Answer</Label>
                                    <Textarea
                                        value={sampleAnswer}
                                        onChange={(e) => setSampleAnswer(e.target.value)}
                                        placeholder="Enter expected answer"
                                        className="min-h-[100px]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">

                                        <Label className="text-lg font-semibold">Evaluation Guidelines</Label>
                                        <Button
                                            variant="outline"
                                            onClick={generateGuidelines}
                                            disabled={isGenerating || true}
                                        >
                                            {isGenerating ? "Generating..." : "Generate Guidelines"}
                                        </Button>
                                    </div>
                                    <Textarea
                                        value={guidelines}
                                        onChange={(e) => setGuidelines(e.target.value)}
                                        placeholder="Enter guidelines for evaluating this answer"
                                        className="min-h-[100px]"
                                    />
                                </div>
                            </div>
                        )}

                        {type === "CODING" && (
                            <div className="space-y-2">
                                <Label className="text-lg font-semibold">Test Cases</Label>
                                <Textarea
                                    value={testCases}
                                    onChange={(e) => setTestCases(e.target.value)}
                                    placeholder="Enter test cases"
                                    className="min-h-[100px] font-mono"
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="p-4 rounded-lg space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                Settings
                            </h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Difficulty</Label>
                                    <Select
                                        value={difficulty}
                                        onValueChange={(value: DifficultyLevel) => setDifficulty(value)}
                                    >
                                        <SelectTrigger className={`w-full ${difficultyColors[difficulty]}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="EASY" className={difficultyColors.EASY}>Easy</SelectItem>
                                            <SelectItem value="MEDIUM" className={difficultyColors.MEDIUM}>Medium</SelectItem>
                                            <SelectItem value="HARD" className={difficultyColors.HARD}>Hard</SelectItem>
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
                    </div>
                    {/* Only show topics section if required */}
                    {requireTopics && (
                        <div className="space-y-2">
                            <Label className="text-lg font-semibold">Topics</Label>
                            <Select
                                onValueChange={handleAddTopic}
                                disabled={availableTopics.length === 0}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={
                                        availableTopics.length === 0
                                            ? "All topics selected"
                                            : "Add topic..."
                                    } />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableTopics.map(topic => (
                                        <SelectItem
                                            key={topic.id}
                                            value={topic.id}
                                        >
                                            {topic.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {selectedTopics.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {selectedTopics.map(topicId => {
                                        const topic = topics.find(t => t.id === topicId);
                                        if (!topic) return null;

                                        return (
                                            <Badge
                                                key={topicId}
                                                variant="secondary"
                                                className="flex items-center gap-1 py-1 px-2"
                                            >
                                                {topic.name}
                                                <X
                                                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                                                    onClick={() => handleRemoveTopic(topicId)}
                                                />
                                            </Badge>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                    {
                        requireTopics && selectedTopics.length === 0 && (
                            <p className="text-sm text-destructive flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                At least one topic is required
                            </p>
                        )
                    }
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                        {editingQuestion ? (
                            <>
                                <Check className="h-4 w-4 mr-2" />
                                Update Question
                            </>
                        ) : (
                            <>
                                <Plus className="h-4 w-4 mr-2" />
                                Save Question
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </ScrollArea>
    );
}

