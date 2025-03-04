import { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/hooks/use-toast";
import { Code, FileText, ListChecks, ToggleLeft, Type, Plus, X, AlertTriangle, Check, Sparkles, ImageIcon, Upload, RotateCcw, Loader2, Trash2, Download } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { Question, QuestionType, DifficultyLevel, MCQQuestion, CodingQuestion } from "@/types/questions";
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
import { Language, LANGUAGE_CONFIGS } from '@/lib/programming-languages';
import { generateTestCode } from '@/lib/test-templates';
import CodeEditor from '../codeEditor/CodeEditor';
import { CodingQuestionForm } from './CodingQuestionForm';
import { generateDriverCode } from '@/lib/test-templates';
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export type BloomsTaxonomyLevel = "REMEMBERING" | "UNDERSTANDING" | "APPLYING" | "ANALYZING" | "EVALUATING" | "CREATING";

const bloomsLevels = [
    { value: "REMEMBERING", label: "Remembering" },
    { value: "UNDERSTANDING", label: "Understanding" },
    { value: "APPLYING", label: "Applying" },
    { value: "ANALYZING", label: "Analyzing" },
    { value: "EVALUATING", label: "Evaluating" },
    { value: "CREATING", label: "Creating" }
] as const;

interface FunctionDetails {
    functionName: string;
    params: Array<{ name: string; type: string }>;
    returnType: string;
    language: Language;
}

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
}

interface OptionWithImage {
    optionId: string;
    option: string;
    image?: string;
}

interface TestCase {
    id: string;
    inputs: string[];
    output: string;
    testCode?: string;
}

interface QuestionDataType {
    type: QuestionType;
    difficulty: DifficultyLevel;
    mark: number;
    question: string;
    explanation: string;
    topics: string[];
    bankId: string;
    _id?: string;
    id?: string;
    options?: OptionWithImage[];
    answer?: string[];
    expectedAnswer?: string;
    guidelines?: string;
    attachedFile?: string;
    functionDetails?: FunctionDetails;
    testCases?: TestCase[];
    language?: Language;
    boilerplateCode?: string;
    driverCode?: string;
    courseOutcome?: string;  // Add this field
}

const questionTypes = [
    { 
        value: 'MCQ', 
        label: 'Multiple Choice', 
        icon: ListChecks,
        description: 'Create multiple choice questions with images and LaTeX support'
    },
    { 
        value: 'TRUE_FALSE', 
        label: 'True/False', 
        icon: ToggleLeft,
        description: 'Simple true or false questions'
    },
    { 
        value: 'FILL_IN_BLANK', 
        label: 'Fill in Blank', 
        icon: Type,
        description: 'Questions where students fill in missing words or values'
    },
    { 
        value: 'DESCRIPTIVE', 
        label: 'Descriptive', 
        icon: FileText,
        description: 'Long form answers with automatic marking guidelines'
    },
    { 
        value: 'CODING', 
        label: 'Coding', 
        icon: Code,
        description: 'Programming questions with test cases and automatic evaluation'
    },
    { 
        value: 'FILE_UPLOAD', 
        label: 'File Upload', 
        icon: Upload,
        description: 'Allow students to upload files as answers'
    }
];

export default function EnhancedQuestionForm(props: QuestionFormProps) {
    const {
        editingQuestion,
        topics = [],
        bankId = '',
        onCancel,
        onSave,
        selectedTopicIds = [],
        requireTopics = true,
        isQuiz = false,
    } = props;

    const { toast } = useToast();
    const [type, setType] = useState<QuestionType>(editingQuestion?.type || "MCQ");
    const [content, setContent] = useState(editingQuestion?.question || "");
    const [difficulty, setDifficulty] = useState<DifficultyLevel>(
        editingQuestion?.difficulty || "EASY"
    );
    const [marks, setMarks] = useState(
        editingQuestion?.mark ? editingQuestion.mark.toString() : ''
    );
    const [courseOutcome, setCourseOutcome] = useState(editingQuestion?.courseOutcome || '');
    const [selectedTopics, setSelectedTopics] = useState<string[]>(() => {
        if (editingQuestion?.topics) {
            return editingQuestion.topics;
        }
        return selectedTopicIds;
    });
    const [explanation, setExplanation] = useState(editingQuestion?.explanation || "");
    const [correctAnswer, setCorrectAnswer] = useState((editingQuestion as any)?.expectedAnswer || "");
    const [sampleAnswer, setSampleAnswer] = useState((editingQuestion as any)?.expectedAnswer || "");
    const [testCases, setTestCases] = useState<TestCase[]>((editingQuestion as CodingQuestion)?.testCases || []);
    const [guidelines, setGuidelines] = useState((editingQuestion as any)?.guidelines || "");
    const [isGenerating, setIsGenerating] = useState(false);
    const [attachedFile, setAttachedFile] = useState<string>((editingQuestion as any)?.attachedFile || '');

    const [prevContent, setPrevContent] = useState("");
    const [prevSampleAnswer, setPrevSampleAnswer] = useState("");
    const [prevGuidelines, setPrevGuidelines] = useState("");
    const [editorKey, setEditorKey] = useState(0);

    const [bloomsLevel, setBloomsLevel] = useState<BloomsTaxonomyLevel>("REMEMBERING");

    const initializeOptions = () => {
        if (editingQuestion && (editingQuestion as MCQQuestion).options) {
            return (editingQuestion as MCQQuestion).options.map((opt: any) => ({
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
        if (editingQuestion && (editingQuestion as MCQQuestion).answer) {
            const mcqQuestion = editingQuestion as MCQQuestion;
            const optionIds = mcqQuestion.options?.map(opt => opt.optionId) || [];
            return mcqQuestion.answer.map(answerId =>
                optionIds.findIndex((id: string) => id === answerId)
            ).filter((index: number) => index !== -1);
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
                    total_score: parseInt(marks) || 5
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

    // Coding-specific state
    const [functionDetails, setFunctionDetails] = useState<FunctionDetails>({
        functionName: "",
        params: [],
        returnType: "",
        language: "octave", 
    });
    const [paramName, setParamName] = useState("");
    const [paramType, setParamType] = useState("");
    const [testCaseInputs, setTestCaseInputs] = useState<string[]>([]);
    const [testCaseOutput, setTestCaseOutput] = useState("");

    const handleAddParameter = () => {
        if (paramName && paramType) {
            setFunctionDetails((prev) => ({
                ...prev,
                params: [...prev.params, { name: paramName, type: paramType }],
            }));
            setParamName("");
            setParamType("");
        }
    };

    const handleRemoveParameter = (index: number) => {
        setFunctionDetails((prev) => ({
            ...prev,
            params: prev.params.filter((_, i) => i !== index),
        }));
    };

    const handleAddTestCase = () => {
        if (testCaseInputs.length === functionDetails.params.length && testCaseOutput) {
            const newTestCase: TestCase = {
                id: testCases.length ? (parseInt(testCases[testCases.length - 1].id) + 1).toString() : "1",
                inputs: testCaseInputs,
                output: testCaseOutput
            };

            // Generate the test code for this case
            const testCode = generateTestCode(
                functionDetails.language,
                functionDetails.functionName,
                [newTestCase]
            );

            setTestCases(prev => [...prev, { ...newTestCase, testCode }]);
            setTestCaseInputs([]);
            setTestCaseOutput("");
        } else {
            toast({
                title: "Error",
                description: "Please provide inputs for all parameters and an output.",
                variant: "destructive",
            });
        }
    };

    const handleRemoveTestCase = (id: string) => {
        setTestCases((prev) => prev.filter((testCase) => testCase.id !== id));
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

            setContent('');
            setTimeout(() => {
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
            // For coding questions, ensure we save the latest state of sample solution
            const sampleSolution = type === 'CODING' ? studentAnswer : '';
            
            const questionData = {
                type,
                difficulty,
                mark: parseInt(marks),
                question: content,
                explanation: explanation.trim(),
                topics: selectedTopics,
                bankId,
                bloomsLevel,
                courseOutcome,  // Add course outcome to the submission
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
                ...(type === 'CODING' ? {
                    boilerplateCode,
                    driverCode,
                    functionDetails,
                    testCases,
                    expectedAnswer: sampleSolution // Use the tracked sample solution
                } : {}),
                ...(editingQuestion?._id && { _id: editingQuestion._id }),
                ...(editingQuestion?.id && { id: editingQuestion.id })
            };

            await onSave(questionData as Question);
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


    // Add these new states after other state declarations
    const [studentAnswer, setStudentAnswer] = useState("");
    const [boilerplateCode, setBoilerplateCode] = useState<string>((editingQuestion as CodingQuestion)?.boilerplateCode || "");
    const [driverCode, setDriverCode] = useState<string>((editingQuestion as CodingQuestion)?.driverCode || "");

    // Update the useEffect to handle edit mode properly
    useEffect(() => {
        if (editingQuestion && editingQuestion.type === 'CODING') {
            const codingQuestion = editingQuestion as CodingQuestion;
            if (codingQuestion.boilerplateCode && codingQuestion.driverCode) {
                setBoilerplateCode(codingQuestion.boilerplateCode);
                setDriverCode(codingQuestion.driverCode);
                setStudentAnswer(codingQuestion.expectedAnswer || '');
            }
        }
    }, [editingQuestion]);

    useEffect(() => {
        if (editingQuestion && editingQuestion.type === 'CODING') {
            const codingQuestion = editingQuestion as CodingQuestion;
            if (codingQuestion.functionDetails) {
                setFunctionDetails(codingQuestion.functionDetails);
            }
            if (codingQuestion.boilerplateCode) {
                setBoilerplateCode(codingQuestion.boilerplateCode);
            }
            if (codingQuestion.driverCode) {
                setDriverCode(codingQuestion.driverCode);
            }
            if (codingQuestion.expectedAnswer) {
                setStudentAnswer(codingQuestion.expectedAnswer);
            }
        }
    }, [editingQuestion]);

    // Add useEffect to update driver code when test cases change
    useEffect(() => {
        if (functionDetails.functionName && testCases.length > 0) {
            const newDriverCode = generateDriverCode(
                functionDetails.language,
                functionDetails.functionName,
                testCases
            );
            setDriverCode(newDriverCode);
        }
    }, [testCases, functionDetails.language, functionDetails.functionName]);

    const renderCodingQuestion = () => {
        if (type !== "CODING") return null;

        return (
            <CodingQuestionForm 
                functionDetails={functionDetails}
                onFunctionDetailsChange={setFunctionDetails}
                testCases={testCases}
                onTestCasesChange={setTestCases}
                boilerplateCode={boilerplateCode}
                onBoilerplateCodeChange={setBoilerplateCode}
                driverCode={driverCode}
                onDriverCodeChange={setDriverCode}
                studentAnswer={studentAnswer}
                onStudentAnswerChange={setStudentAnswer}
            />
        );
    };

    const renderMCQQuestion = () => (
        <div className="space-y-6">
            <Separator className="my-6" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {optionsWithIds.map((option, index) => (
                    <Card 
                        key={option.optionId} 
                        className={`relative transition-all duration-200 transform hover:scale-[1.02] ${
                            correctOptions.includes(index) 
                                ? 'ring-2 ring-green-500/50 dark:ring-green-500/30' 
                                : 'hover:border-muted-foreground'
                        }`}
                    >
                        <div 
                            className="absolute -right-2 -top-2 z-10 cursor-pointer transform hover:scale-110 transition-transform"
                            onClick={() => {
                                if (correctOptions.includes(index)) {
                                    setCorrectOptions(correctOptions.filter(i => i !== index));
                                } else {
                                    setCorrectOptions([...correctOptions, index]);
                                }
                            }}
                        >
                            <div className={`
                                w-6 h-6 rounded-full flex items-center justify-center shadow-sm
                                ${correctOptions.includes(index) 
                                    ? 'bg-green-500 dark:bg-green-600' 
                                    : 'bg-muted-foreground hover:bg-muted-foreground/80'}
                            `}>
                                <Check className="h-3.5 w-3.5 text-white" />
                            </div>
                        </div>

                        <CardContent className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <Badge variant="outline" className="bg-background">Option {index + 1}</Badge>
                                {optionsWithIds.length > 2 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteOption(index)}
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Textarea
                                    value={option.option}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    placeholder={`Enter option ${index + 1}...`}
                                    rows={2}
                                    className="resize-none"
                                />
                                {option.option && (
                                    <div className="p-2 bg-muted rounded-md">
                                        <LatexPreview content={option.option} />
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="file"
                                    id={`option-image-${index}`}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleOptionImageUpload(index, e)}
                                />
                                <label
                                    htmlFor={`option-image-${index}`}
                                    className="cursor-pointer inline-flex items-center gap-1.5 px-2 py-1 rounded-md
                                        text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    <ImageIcon className="h-4 w-4" />
                                    {option.image ? 'Change Image' : 'Add Image'}
                                </label>
                            </div>

                            {option.image && (
                                <div className="mt-2 relative group">
                                    <CustomImage src={option.image} alt={`Option ${index + 1}`} />
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                        onClick={() => {
                                            const newOptions = [...optionsWithIds];
                                            newOptions[index] = {
                                                ...newOptions[index],
                                                image: undefined
                                            };
                                            setOptionsWithIds(newOptions);
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
            
            <Button 
                variant="outline" 
                onClick={handleAddOption} 
                className="w-full h-12 text-muted-foreground hover:text-foreground
                    border-dashed hover:border-solid transition-colors"
            >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
            </Button>
        </div>
    );

    const renderTrueFalseQuestion = () => (
        <div className="space-y-6">
            <Separator className="my-6" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {optionsWithIds.map((option, index) => (
                    <Card 
                        key={option.optionId}
                        className={`relative transition-all duration-200 transform hover:scale-[1.02] cursor-pointer
                            ${correctOptions.includes(index) 
                                ? 'ring-2 ring-green-500/50 dark:ring-green-500/30' 
                                : 'hover:border-muted-foreground'
                            }`}
                        onClick={() => {
                            if (correctOptions.includes(index)) {
                                setCorrectOptions([]);
                            } else {
                                setCorrectOptions([index]);
                            }
                        }}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className={`
                                    w-5 h-5 rounded flex items-center justify-center transition-colors
                                    ${correctOptions.includes(index) 
                                        ? 'bg-green-500 dark:bg-green-600' 
                                        : 'border-2 border-muted-foreground/30'}
                                `}>
                                    {correctOptions.includes(index) && (
                                        <Check className="h-3.5 w-3.5 text-white" />
                                    )}
                                </div>
                                <span className="text-lg">{option.option}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );

    const renderFillInBlankQuestion = () => (
        <div className="space-y-6">
            <Separator className="my-6" />
            
            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-lg">Correct Answer</Label>
                        <div className="space-y-2">
                            <Input
                                value={correctAnswer}
                                onChange={(e) => setCorrectAnswer(e.target.value)}
                                placeholder="Enter the correct answer"
                                className="text-lg p-6"
                            />
                            {correctAnswer && (
                                <div className="p-2 bg-muted rounded-md">
                                    <Label className="text-sm text-muted-foreground mb-1">Preview:</Label>
                                    <LatexPreview content={correctAnswer} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-2 text-sm text-muted-foreground">
                        <p>Tips:</p>
                        <ul className="list-disc list-inside space-y-1 mt-1">
                            <li>For exact matches, enter all accepted variations separated by | (e.g. "4 | four")</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    const renderDescriptiveQuestion = () => (
        <div className="space-y-6">
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold">Expected Answer</Label>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={enhanceQuestion}
                            disabled={isGenerating || !content || !sampleAnswer}
                        >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Enhance Question
                        </Button>
                        {prevContent && prevSampleAnswer && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={undoEnhancement}
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Undo Enhancement
                            </Button>
                        )}
                    </div>
                </div>
                <RichTextEditor
                    content={sampleAnswer}
                    onChange={setSampleAnswer}
                    placeholder="Enter the expected answer..."
                />
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold">Marking Guidelines</Label>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={generateGuidelines}
                            disabled={isGenerating || !content || !sampleAnswer}
                        >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Guidelines
                        </Button>
                        {prevGuidelines && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={undoGuidelines}
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Undo Generation
                            </Button>
                        )}
                    </div>
                </div>
                <RichTextEditor
                    content={guidelines}
                    onChange={setGuidelines}
                    placeholder="Enter marking guidelines..."
                />
            </div>
        </div>
    );

    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [fileSize, setFileSize] = useState<number>(0);

    const renderFileUploadQuestion = () => {
        const getFileName = (url: string) => {
            try {
                return decodeURIComponent(url.split('/').pop() || '');
            } catch {
                return url.split('/').pop() || '';
            }
        };

        const validateFile = (file: File) => {
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                toast({
                    title: "Error",
                    description: "File size must be less than 10MB",
                    variant: "destructive"
                });
                return false;
            }
            return true;
        };

        const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file || !validateFile(file)) return;

            setIsUploading(true);
            setUploadProgress(0);
            setUploadError(null);
            setFileSize(file.size);

            try {
                const formData = new FormData();
                formData.append('file', file);

                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/api/upload/quiz-file', true);

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const progress = (event.loaded / event.total) * 100;
                        setUploadProgress(progress);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status === 200) {
                        const response = JSON.parse(xhr.response);
                        setAttachedFile(response.url);
                        toast({
                            title: "Success",
                            description: "File uploaded successfully"
                        });
                    } else {
                        throw new Error('Upload failed');
                    }
                };

                xhr.onerror = () => {
                    throw new Error('Upload failed');
                };

                xhr.send(formData);
            } catch (error) {
                setUploadError("Failed to upload file");
                toast({
                    title: "Error",
                    description: "Failed to upload file",
                    variant: "destructive"
                });
            } finally {
                setIsUploading(false);
            }
        };

        return (
            <div className="space-y-6">
                <Separator className="my-6" />
                
                <Card>
                    <CardContent className="p-6">
                        <div className="space-y-2">
                            <Label className="text-lg font-medium">File Requirements</Label>
                            <div className="space-y-4">
                                {!attachedFile ? (
                                    <>
                                        <input
                                            type="file"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            id="file-upload"
                                            disabled={isUploading}
                                        />
                                        <label htmlFor="file-upload">
                                            <div className={`
                                                border-2 border-dashed rounded-lg p-8 cursor-pointer 
                                                hover:bg-secondary/50 transition-colors text-center
                                                ${uploadError ? 'border-destructive' : ''}
                                                ${isUploading ? 'cursor-not-allowed opacity-50' : ''}
                                            `}>
                                                <div className="flex flex-col items-center gap-3">
                                                    {isUploading ? (
                                                        <>
                                                            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                                                            <div className="space-y-2 w-full max-w-xs">
                                                                <Progress value={uploadProgress} className="w-full" />
                                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                                    <span>Uploading... {Math.round(uploadProgress)}%</span>
                                                                    <span>{(fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="h-10 w-10 text-muted-foreground" />
                                                            <div>
                                                                <p className="text-base font-medium">
                                                                    Click to upload or drag and drop
                                                                </p>
                                                                <p className="text-sm text-muted-foreground mt-1">
                                                                    Maximum file size: 10MB
                                                                </p>
                                                            </div>
                                                        </>
                                                    )}
                                                    {uploadError && (
                                                        <p className="text-sm text-destructive mt-2">{uploadError}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </label>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                                        <div className="flex-1 flex items-center gap-3">
                                            <div className="p-2 bg-background rounded-md">
                                                <FileText className="h-6 w-6 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{getFileName(attachedFile)}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Uploaded successfully
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => window.open(attachedFile, '_blank')}
                                                className="gap-2"
                                            >
                                                <Download className="h-4 w-4" />
                                                Download
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => setAttachedFile('')}
                                                className="gap-2"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderQuestionDetails = () => (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Question</Label>
                <Card>
                    <CardContent className="p-4">
                        <RichTextEditor
                            key={editorKey}
                            content={content}
                            onChange={setContent}
                            placeholder="Enter your question here..."
                        />
                    </CardContent>
                </Card>
            </div>

            {(type === "MCQ" || type === "TRUE_FALSE" || type === "FILL_IN_BLANK") && (
                <div className="space-y-2">
                    <Label>Explanation <span className="text-xs text-muted-foreground">(not visible to students during exams)</span></Label>
                    <Card>
                        <CardContent className="p-4">
                            <RichTextEditor
                                content={explanation}
                                onChange={setExplanation}
                                placeholder="Enter an explanation for this question..."
                            />
                        </CardContent>
                    </Card>
                </div>
            )}

            {type === "MCQ" && renderMCQQuestion()}
            {type === "TRUE_FALSE" && renderTrueFalseQuestion()}
            {type === "FILL_IN_BLANK" && renderFillInBlankQuestion()}
            {type === "DESCRIPTIVE" && renderDescriptiveQuestion()}
            {type === "CODING" && renderCodingQuestion()}
            {type === "FILE_UPLOAD" && renderFileUploadQuestion()}
        </div>
    );

    return (
        <div className="h-full flex flex-col">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                <div className="container mx-auto p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex gap-2 overflow-x-auto">
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
                                                <qType.icon className="h-5 w-5 ml-2" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{qType.description}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button onClick={handleSubmit}>
                                {editingQuestion ? 'Update Question' : 'Save Question'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="container mx-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr,300px] gap-6">
                        {renderQuestionDetails()}
                        
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Question Settings</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Difficulty</Label>
                                        <Select value={difficulty} onValueChange={(value: DifficultyLevel) => setDifficulty(value)}>
                                            <SelectTrigger className={difficulty ? difficultyColors[difficulty] : ''}>
                                                <SelectValue placeholder="Select difficulty" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="EASY">Easy</SelectItem>
                                                <SelectItem value="MEDIUM">Medium</SelectItem>
                                                <SelectItem value="HARD">Hard</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Blooms Taxonomy Level</Label>
                                        <Select value={bloomsLevel} onValueChange={(value: BloomsTaxonomyLevel) => setBloomsLevel(value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select level" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {bloomsLevels.map(level => (
                                                    <SelectItem key={level.value} value={level.value}>
                                                        {level.label}
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
                                            placeholder="Enter marks"
                                        />
                                    </div>

                                    {/* Course Outcome Selection */}
                                    <div className="space-y-2">
                                        <Label>Course Outcome</Label>
                                        <Select
                                            value={courseOutcome}
                                            onValueChange={setCourseOutcome}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select course outcome" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Array.from({ length: 8 }, (_, i) => `CO${i + 1}`).map((co) => (
                                                    <SelectItem key={co} value={co}>
                                                        {co}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>

                            {requireTopics && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Topics</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <Select onValueChange={handleAddTopic} disabled={availableTopics.length === 0}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={availableTopics.length === 0 ? "All topics selected" : "Add topic..."} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableTopics.map(topic => (
                                                    <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {selectedTopics.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {selectedTopics.map(topicId => {
                                                    const topic = topics.find(t => t.id === topicId);
                                                    return topic ? (
                                                        <Badge key={topicId} variant="secondary" className="flex items-center gap-1">
                                                            {topic.name}
                                                            <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTopic(topicId)} />
                                                        </Badge>
                                                    ) : null;
                                                })}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

