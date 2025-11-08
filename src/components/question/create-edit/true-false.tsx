"use client";

import { TrueFalseQuestion } from "@/types/questions";
import { TiptapEditor } from "@/components/rich-text-editor/editor";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Check, X } from "lucide-react";

interface TrueFalseComponentProps {
    value: TrueFalseQuestion;
    onChange: (question: TrueFalseQuestion) => void;
}

export default function TrueFalseComponent({ value, onChange }: TrueFalseComponentProps) {
    const handleQuestionChange = (content: string) => {
        onChange({ ...value, question: content });
    };

    const handleAnswerChange = (answer: boolean) => {
        onChange({ ...value, trueFalseAnswer: answer });
    };

    const currentAnswer = value.trueFalseAnswer;

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
                        className="min-h-[200px]"
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Select Correct Answer</CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Choose whether the statement is True or False
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <Button
                            type="button"
                            onClick={() => handleAnswerChange(true)}
                            variant={currentAnswer === true ? "default" : "outline"}
                            className={`flex-1 h-20 text-lg font-semibold ${
                                currentAnswer === true
                                    ? "bg-green-600 hover:bg-green-700 text-white"
                                    : "hover:bg-green-50 dark:hover:bg-green-950/20 hover:border-green-500"
                            }`}
                        >
                            <Check className="mr-2 h-6 w-6" />
                            True
                        </Button>
                        <Button
                            type="button"
                            onClick={() => handleAnswerChange(false)}
                            variant={currentAnswer === false ? "default" : "outline"}
                            className={`flex-1 h-20 text-lg font-semibold ${
                                currentAnswer === false
                                    ? "bg-red-600 hover:bg-red-700 text-white"
                                    : "hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-500"
                            }`}
                        >
                            <X className="mr-2 h-6 w-6" />
                            False
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
