"use client";

import { useState } from "react";
import { Question, QuestionType } from "@/types/questions";
import { useToast } from "@/hooks/use-toast";
import QuestionTypeSelector from "./question-type-selector";
import QuestionSettings from "./question-settings";
import { getQuestionComponent, createDefaultQuestion } from "../question-factory";
import { validateQuestion } from "../question-validator";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, AlertCircle, FileText, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TiptapEditor } from "@/components/rich-text-editor/editor";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface QuestionFormProps {
    initialData?: Question;
    onSave: (question: Question) => void;
    onSaveAndContinue?: (question: Question) => void;
    onUpdateInBank?: (question: Question) => void;
    onCancel: () => void;
    isLoading?: boolean;
    isUpdatingBank?: boolean;
    context?: "bank" | "quiz";
    bankId?: string;
    bankName?: string;
    defaultTopics?: Array<{ topicId: string; topicName: string }>;
}

export default function QuestionForm({
    initialData,
    onSave,
    onSaveAndContinue,
    onUpdateInBank,
    onCancel,
    isLoading = false,
    isUpdatingBank = false,
    context = "quiz",
    bankId,
    bankName,
    defaultTopics = [],
}: QuestionFormProps) {
    const [selectedType, setSelectedType] = useState<QuestionType>(
        initialData?.type || QuestionType.MCQ
    );
    const [question, setQuestion] = useState<Question>(() => {
        if (initialData) {
            return initialData;
        }
        const defaultQuestion = createDefaultQuestion(QuestionType.MCQ);
        // Apply default topics if provided
        if (defaultTopics.length > 0) {
            return { ...defaultQuestion, topics: defaultTopics };
        }
        return defaultQuestion;
    });
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [showExplanation, setShowExplanation] = useState<boolean>(!!initialData?.explanation);

    const { error } = useToast();

    const handleTypeChange = (newType: QuestionType) => {
        const newQuestion = createDefaultQuestion(newType);

        const commonFields = {
            question: question.question,
            explanation: question.explanation,
            marks: question.marks,
            negativeMarks: question.negativeMarks,
            topics: question.topics, // Preserve existing topics (including default ones)
            bloomTaxonomyLevel: question.bloomTaxonomyLevel,
            difficulty: question.difficulty,
            courseOutcome: question.courseOutcome,
        };

        const updatedQuestion = {
            ...newQuestion,
            ...commonFields,
        } as Question;

        setSelectedType(updatedQuestion.type);
        setQuestion(updatedQuestion);
    };

    const validateQuestionData = (): boolean => {
        if (!question) {
            setValidationErrors(["Question data is missing"]);
            return false;
        }

        const result = validateQuestion(question);
        setValidationErrors(result.errors.map((e) => e.message));
        return result.isValid;
    };

    const handleSave = () => {
        if (!validateQuestionData() || !question) {
            error("Please fix validation errors before saving");
            return;
        }

        onSave(question);
    };

    const handleSaveAndContinue = () => {
        if (!validateQuestionData() || !question) {
            error("Please fix validation errors before saving");
            return;
        }

        if (onSaveAndContinue) {
            onSaveAndContinue(question);
        }
    };

    const handleUpdateInBank = () => {
        if (!validateQuestionData() || !question) {
            error("Please fix validation errors before saving");
            return;
        }

        if (onUpdateInBank) {
            onUpdateInBank(question);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="p-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {initialData ? "Edit Question" : "Create Question"}
                        </h1>
                    </div>
                    <div className="gap-4 flex">
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                        {!initialData && onSaveAndContinue && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleSaveAndContinue}
                                disabled={isLoading}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Save & Add Another
                            </Button>
                        )}
                        {initialData && onUpdateInBank && bankName && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleUpdateInBank}
                                disabled={isLoading || isUpdatingBank}
                                className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {isUpdatingBank ? "Updating..." : `Update in ${bankName}`}
                            </Button>
                        )}
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={isLoading || isUpdatingBank}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {isLoading
                                ? "Saving..."
                                : initialData
                                  ? "Update Question"
                                  : "Create Question"}
                        </Button>
                    </div>
                </div>
            </Card>

            <QuestionTypeSelector
                selectedType={selectedType}
                onSelect={handleTypeChange}
                disabled={!!initialData}
            />

            {validationErrors.length > 0 && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <ul className="list-inside list-disc space-y-1">
                            {validationErrors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                <div className="space-y-6 lg:col-span-3">
                    {question &&
                        (() => {
                            const QuestionComponent = getQuestionComponent(question.type);
                            return <QuestionComponent value={question} onChange={setQuestion} />;
                        })()}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <FileText className="h-5 w-5 text-primary" />
                                    Explanation (Optional)
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="explanation-toggle"
                                        checked={showExplanation}
                                        onCheckedChange={setShowExplanation}
                                    />
                                    <Label htmlFor="explanation-toggle" className="cursor-pointer">
                                        {showExplanation ? "Hide" : "Show"}
                                    </Label>
                                </div>
                            </div>
                        </CardHeader>
                        {showExplanation && (
                            <CardContent>
                                <p className="mb-4 text-xs text-muted-foreground">
                                    Provide an explanation that will be shown after the question is
                                    answered
                                </p>
                                <TiptapEditor
                                    initialContent={question.explanation || ""}
                                    onUpdate={(content) =>
                                        setQuestion({ ...question, explanation: content })
                                    }
                                />
                            </CardContent>
                        )}
                    </Card>
                </div>

                <div className="lg:col-span-1">
                    <div className="sticky top-6">
                        <Card>
                            <CardContent>
                                <QuestionSettings
                                    value={question}
                                    onChange={setQuestion}
                                    context={context}
                                    bankId={bankId}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
