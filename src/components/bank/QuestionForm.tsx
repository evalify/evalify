import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/hooks/use-toast";
import { Code, FileText, ListChecks, ToggleLeft, Type, Edit2, Plus, X, AlertTriangle, Check, ChevronDown, Sparkles, ImageIcon, Upload, RotateCcw } from 'lucide-react';
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
    onSave: (question: Question) => Promise<void>;
    editingQuestion?: Question | null;
    allTopics?: string[];
    selectedTopicIds?: string[];
    requireTopics?: boolean;
    isQuiz?: boolean;
    quizId?: string;
}

interface OptionWithImage {
    optionId: string;
    option: string;
    image?: string;
}

export default function EnhancedQuestionForm({
    editingQuestion,
    topics = [],
    bankId = '',
    onCancel,
    onSave,
    selectedTopicIds = [],
    requireTopics = true,
    isQuiz = false,
    quizId
}: QuestionFormProps) {
    const { toast } = useToast();
    const [type, setType] = useState<QuestionType>(editingQuestion?.type || "MCQ");
    const [content, setContent] = useState(editingQuestion?.question || editingQuestion?.content || "");
    const [difficulty, setDifficulty] = useState<DifficultyLevel | ''>(
        editingQuestion?.difficulty || ''
    );
    const [marks, setMarks] = useState(
        editingQuestion?.mark ? editingQuestion.mark.toString() : ''
    );
    const [selectedTopics, setSelectedTopics] = useState<string[]>(() => {
        if (editingQuestion?.topics) {
            return editingQuestion.topics;
        }
        return selectedTopicIds;
    });
    const [explanation, setExplanation] = useState(editingQuestion?.explanation || "");
    const [correctAnswer, setCorrectAnswer] = useState(editingQuestion?.expectedAnswer || "");
    const [sampleAnswer, setSampleAnswer] = useState(editingQuestion?.expectedAnswer || "");
    const [testCases, setTestCases] = useState(editingQuestion?.testCases || "");
    const [guidelines, setGuidelines] = useState(editingQuestion?.guidelines || "");
    const [isGenerating, setIsGenerating] = useState(false);
    const [attachedFile, setAttachedFile] = useState<string>(editingQuestion?.attachedFile || '');

    const [prevContent, setPrevContent] = useState("");
    const [prevSampleAnswer, setPrevSampleAnswer] = useState("");
    const [prevGuidelines, setPrevGuidelines] = useState("");
    const [editorKey, setEditorKey] = useState(0);

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
            // Save current state for undo
            setPrevGuidelines(guidelines);

            const response = await fetch(`/api/eval/generate-guidelines`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: content,
                    expected_ans: sampleAnswer,
                    total_score: parseInt(marks) || 10
                }),
            });

            if (!response.ok) {
                throw new Error('Guidelines generation failed');
            }

            const data = await response.json();
            setGuidelines(data.guidelines);

            toast({
                title: "Success",
                description: "Guidelines generated successfully",
            });
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

    const undoGuidelines = () => {
        if (prevGuidelines) {
            setGuidelines(prevGuidelines);
            setPrevGuidelines("");
            toast({
                title: "Undo",
                description: "Guidelines reversed",
            });
        }
    };

    const enhanceQuestion = async () => {
        setIsGenerating(true);
        try {
            // Save current state for undo
            setPrevContent(content);
            setPrevSampleAnswer(sampleAnswer);

            const response = await fetch(`/api/eval/enhance-qa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: content,
                    expected_ans: sampleAnswer
                }),
            });

            if (!response.ok) {
                throw new Error('Enhancement failed');
            }

            const data = await response.json();

            // Force a re-render of RichTextEditor by triggering state updates
            setContent('');  // First clear the content
            setTimeout(() => {  // Then set the new content in the next tick
                setContent(data.enhanced_question);
            }, 0);

            setSampleAnswer(data.enhanced_expected_ans);

            toast({
                title: "Success",
                description: "Question enhanced successfully",
            });
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

    const undoEnhancement = () => {
        if (prevContent && prevSampleAnswer) {
            setContent(prevContent);
            setSampleAnswer(prevSampleAnswer);
            setPrevContent("");
            setPrevSampleAnswer("");
            toast({
                title: "Undo",
                description: "Enhancement reversed",
            });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload/quiz-file', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const { url } = await response.json();
            setAttachedFile(url);
            toast({
                title: "Success",
                description: "File uploaded successfully"
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to upload file",
                variant: "destructive"
            });
        }
    };

    const questionTypes = [
        { value: 'MCQ', label: 'Multiple Choice', icon: ListChecks },
        { value: 'TRUE_FALSE', label: 'True/False', icon: ToggleLeft },
        { value: 'FILL_IN_BLANK', label: 'Fill in Blank', icon: Type },
        { value: 'DESCRIPTIVE', label: 'Descriptive', icon: FileText },
        { value: 'FILE_UPLOAD', label: 'File Upload', icon: Upload },
        // { value: 'CODING', label: 'Coding', icon: Code }
    ];

    const difficultyColors = {
        EASY: "bg-green-100 text-green-800",
        MEDIUM: "bg-yellow-100 text-yellow-800",
        HARD: "bg-red-100 text-red-800"
    };

    const validateForm = () => {
        if (!difficulty) {
            toast({
                title: "Validation Error",
                description: "Please select difficulty level",
                variant: "destructive"
            });
            return false;
        }

        if (!marks || parseInt(marks) < 1) {
            toast({
                title: "Validation Error",
                description: "Please enter valid marks (minimum 1)",
                variant: "destructive"
            });
            return false;
        }

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

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            const questionData = {
                type,
                difficulty,
                mark: parseInt(marks),
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
                ...(type === 'FILE_UPLOAD' ? {
                    attachedFile: attachedFile
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

    const handleAddOption = () => {
        setOptionsWithIds(prev => [...prev, {
            optionId: uuidv4().replace(/-/g, ''),
            option: ''
        }]);
    };

    const handleDeleteOption = (index: number) => {
        setOptionsWithIds(prev => prev.filter((_, i) => i !== index));
        setCorrectOptions(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
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
                                key={editorKey}
                                content={content}
                                onChange={setContent}
                                placeholder="Enter your question here..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-lg font-semibold">Explanation (not visible to students during exams)</Label>
                            <RichTextEditor
                                content={explanation}
                                onChange={setExplanation}
                                placeholder="Enter an explanation for this question..."
                            />
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="p-4 rounded-lg space-y-4">
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
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1">
                                        Difficulty
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={difficulty}
                                        onValueChange={(value: DifficultyLevel) => setDifficulty(value)}
                                    >
                                        <SelectTrigger className={`w-full ${difficulty ? difficultyColors[difficulty] : 'border-destructive'}`}>
                                            <SelectValue placeholder="Select difficulty" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="EASY" className={difficultyColors.EASY}>Easy</SelectItem>
                                            <SelectItem value="MEDIUM" className={difficultyColors.MEDIUM}>Medium</SelectItem>
                                            <SelectItem value="HARD" className={difficultyColors.HARD}>Hard</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1">
                                        Marks
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        value={marks}
                                        onChange={(e) => setMarks(e.target.value)}
                                        min="1"
                                        className={!marks ? 'border-destructive' : ''}
                                        placeholder="Enter marks"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mr-8">
                    {(type === "MCQ" || type === "TRUE_FALSE") && (
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <Label className="text-lg font-semibold">
                                    {type === "TRUE_FALSE" ? "Select the correct answer" : "Options"}
                                </Label>
                                {type === "MCQ" && (
                                    <Button
                                        variant="outline"
                                        className=" border-dashed"
                                        onClick={handleAddOption}
                                    >
                                        <Plus className=" w-5 mr-2" />
                                        Add Option
                                    </Button>
                                )}
                            </div>

                            <div className={`grid ${type === "TRUE_FALSE" ? "grid-cols-2" : "grid-cols-1 md:grid-cols-1"} gap-4`}>
                                {optionsWithIds.map((option, index) => (
                                    <div key={option.optionId}
                                        className={`flex flex-col gap-2 ${type === "TRUE_FALSE"
                                            ? "justify-center p-4 hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer"
                                            : "bg-gray-50 dark:bg-gray-900 p-3"
                                            } rounded-md ${correctOptions.includes(index)
                                                ? "bg-green-100 dark:bg-green-900 border-2 border-green-500"
                                                : ""
                                            }`}
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
                                                    <div className="flex items-center gap-2">
                                                        <Textarea
                                                            value={option.option}
                                                            onChange={(e) => handleOptionChange(index, e.target.value)}
                                                            placeholder={`Option ${index + 1}`}
                                                        />
                                                    </div>
                                                    <div className="text-sm text-muted-foreground p-2 bg-background rounded">
                                                        <LatexPreview content={option.option} />
                                                    </div>
                                                </div>
                                            )}
                                            {
                                                type === "MCQ" && (
                                                    <div className="flex flex-col">
                                                        <Button variant="outline" className="relative overflow-hidden" size="icon">
                                                            <input
                                                                type="file"
                                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                                accept="image/*"
                                                                onChange={(e) => handleOptionImageUpload(index, e)}
                                                            />
                                                            <ImageIcon className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="hover:bg-destructive hover:text-white"
                                                            onClick={() => handleDeleteOption(index)}
                                                            disabled={optionsWithIds.length <= 2}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )
                                            }
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
                                    disabled={isGenerating}
                                >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    {isGenerating ? "Enhancing..." : "Enhance Question & Answer"}
                                </Button>
                                {prevContent && prevSampleAnswer && (
                                    <Button
                                        variant="ghost"
                                        onClick={undoEnhancement}
                                        className="text-yellow-600 hover:text-yellow-700"
                                    >
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        Undo Enhancement
                                    </Button>
                                )}
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
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={generateGuidelines}
                                            disabled={isGenerating}
                                        >
                                            {isGenerating ? "Generating..." : "Generate Guidelines"}
                                        </Button>
                                        {prevGuidelines && (
                                            <Button
                                                variant="ghost"
                                                onClick={undoGuidelines}
                                                className="text-yellow-600 hover:text-yellow-700"
                                            >
                                                <RotateCcw className="h-4 w-4 mr-2" />
                                                Undo
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <Textarea
                                    value={guidelines}
                                    onChange={(e) => setGuidelines(e.target.value)}
                                    placeholder="Enter guidelines for evaluating this answer"
                                    className="min-h-[400px]"
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

                    {type === "FILE_UPLOAD" && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => document.getElementById('file-upload')?.click()}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    {attachedFile ? 'Change File' : 'Upload File'}
                                </Button>
                                {attachedFile && (
                                    <a
                                        href={attachedFile}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:underline"
                                    >
                                        View Uploaded File
                                    </a>
                                )}
                            </div>
                            <input
                                type="file"
                                id="file-upload"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </div>
                    )}
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t mr-8">
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

        </ScrollArea >
    );
}

