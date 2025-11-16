"use client";

import { DescriptiveQuestion } from "@/types/questions";
import { TiptapEditor } from "@/components/rich-text-editor/editor";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText, BookOpen, Key, FileSignature, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface DescriptiveComponentProps {
    value: DescriptiveQuestion;
    onChange: (question: DescriptiveQuestion) => void;
}

export default function DescriptiveComponent({ value, onChange }: DescriptiveComponentProps) {
    const handleQuestionChange = (content: string) => {
        onChange({ ...value, question: content });
    };

    const handleModelAnswerChange = (content: string) => {
        onChange({
            ...value,
            descriptiveConfig: {
                ...value.descriptiveConfig,
                modelAnswer: content,
            },
        });
    };

    const handleKeywordsChange = (keywords: string[]) => {
        onChange({
            ...value,
            descriptiveConfig: {
                ...value.descriptiveConfig,
                keywords,
            },
        });
    };

    const handleAddKeyword = () => {
        const currentKeywords = value.descriptiveConfig?.keywords || [""];
        handleKeywordsChange([...currentKeywords, ""]);
    };

    const handleRemoveKeyword = (index: number) => {
        const currentKeywords = value.descriptiveConfig?.keywords || [""];
        const filtered = currentKeywords.filter((_, i) => i !== index);
        // Never allow empty array - always keep at least one empty input
        handleKeywordsChange(filtered.length === 0 ? [""] : filtered);
    };

    const handleKeywordChange = (index: number, keyword: string) => {
        const currentKeywords = value.descriptiveConfig?.keywords || [""];
        const updatedKeywords = [...currentKeywords];
        updatedKeywords[index] = keyword;
        handleKeywordsChange(updatedKeywords);
    };

    const handleMinWordsChange = (minWords: number) => {
        onChange({
            ...value,
            descriptiveConfig: {
                ...value.descriptiveConfig,
                minWords,
            },
        });
    };

    const handleMaxWordsChange = (maxWords: number) => {
        onChange({
            ...value,
            descriptiveConfig: {
                ...value.descriptiveConfig,
                maxWords,
            },
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5 text-primary" />
                        Question
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <TiptapEditor
                        initialContent={value.question || ""}
                        onUpdate={handleQuestionChange}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <BookOpen className="h-5 w-5 text-primary" />
                        Model Answer (Optional)
                    </CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Provide a reference answer for grading purposes
                    </p>
                </CardHeader>
                <CardContent>
                    <TiptapEditor
                        initialContent={value.descriptiveConfig?.modelAnswer || ""}
                        onUpdate={handleModelAnswerChange}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Key className="h-5 w-5 text-primary" />
                        Keywords (Optional)
                    </CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Enter keywords for automated grading assistance
                    </p>
                </CardHeader>
                <CardContent className="space-y-2">
                    {(value.descriptiveConfig?.keywords || [""]).map((keyword, index) => (
                        <div key={index} className="flex gap-2">
                            <Input
                                placeholder={`Keyword ${index + 1}`}
                                value={keyword}
                                onChange={(e) => handleKeywordChange(index, e.target.value)}
                            />
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveKeyword(index)}
                                disabled={(value.descriptiveConfig?.keywords || [""]).length === 1}
                                className="hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddKeyword}
                        className="w-full"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Keyword
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FileSignature className="h-5 w-5 text-primary" />
                        Word Limits (Optional)
                    </CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Set minimum and maximum word count for the answer
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="minWords">Minimum Words</Label>
                            <Input
                                id="minWords"
                                type="number"
                                min="0"
                                placeholder="e.g., 50"
                                value={value.descriptiveConfig?.minWords ?? ""}
                                onChange={(e) =>
                                    handleMinWordsChange(parseInt(e.target.value, 10) || 0)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maxWords">Maximum Words</Label>
                            <Input
                                id="maxWords"
                                type="number"
                                min="0"
                                placeholder="e.g., 500"
                                value={value.descriptiveConfig?.maxWords ?? ""}
                                onChange={(e) =>
                                    handleMaxWordsChange(parseInt(e.target.value, 10) || 0)
                                }
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
