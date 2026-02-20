"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { QuizQuestion } from "../context/quiz-context";
import { ContentPreview } from "@/components/rich-text-editor/content-preview";
import { QuestionHeader } from "./question-header";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Code, FileCode, Clock, HardDrive } from "lucide-react";
import type { CodingStudentAnswer, StudentCodingConfig, StudentTestCase } from "../lib/types";
import type { ProgrammingLanguage } from "@/types/questions";
import { debounce } from "lodash-es";

interface CodingQuestionProps {
    question: QuizQuestion;
    onAnswerChange: (answer: CodingStudentAnswer) => void;
}

// Language display names and syntax highlighting modes
const LANGUAGE_CONFIG: Record<ProgrammingLanguage, { name: string; extension: string }> = {
    JAVA: { name: "Java", extension: ".java" },
    PYTHON: { name: "Python", extension: ".py" },
    CPP: { name: "C++", extension: ".cpp" },
    JAVASCRIPT: { name: "JavaScript", extension: ".js" },
    C: { name: "C", extension: ".c" },
    OCTAVE: { name: "Octave", extension: ".m" },
    SCALA: { name: "Scala", extension: ".scala" },
};

export function CodingQuestion({ question, onAnswerChange }: CodingQuestionProps) {
    const codingConfig: StudentCodingConfig | undefined = question.codingConfig;
    const testCases: StudentTestCase[] = question.testCases || [];

    // Filter to only show visible test cases to students
    // (server already filters to VISIBLE only, but this is a safety check)
    const visibleTestCases = testCases.filter((tc) => tc.visibility === "VISIBLE");

    // Get saved answer
    const savedAnswer = question.response as CodingStudentAnswer | undefined;
    const defaultLanguage = codingConfig?.language || ("PYTHON" as ProgrammingLanguage);

    // Local state
    const [code, setCode] = useState<string>(
        () => savedAnswer?.studentAnswer?.code || codingConfig?.templateCode || ""
    );
    const [language, setLanguage] = useState<ProgrammingLanguage>(
        () => savedAnswer?.studentAnswer?.language || defaultLanguage
    );
    const [activeTab, setActiveTab] = useState<string>("code");

    // Create a stable debounced save function
    const debouncedSaveRef = useRef(
        debounce((newCode: string, newLanguage: ProgrammingLanguage) => {
            const answer: CodingStudentAnswer = {
                studentAnswer: {
                    code: newCode,
                    language: newLanguage,
                },
            };
            onAnswerChange(answer);
        }, 500)
    );

    // Update local state when question changes
    useEffect(() => {
        setCode(savedAnswer?.studentAnswer?.code || codingConfig?.templateCode || "");
        setLanguage(savedAnswer?.studentAnswer?.language || defaultLanguage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [question.id]);

    // Cleanup debounce on unmount
    useEffect(() => {
        const debouncedFn = debouncedSaveRef.current;
        return () => {
            debouncedFn.cancel();
        };
    }, []);

    const handleCodeChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const newCode = e.target.value;
            setCode(newCode);
            debouncedSaveRef.current(newCode, language);
        },
        [language]
    );

    const handleLanguageChange = useCallback(
        (newLanguage: ProgrammingLanguage) => {
            setLanguage(newLanguage);
            debouncedSaveRef.current(code, newLanguage);
        },
        [code]
    );

    // Check if language selection is allowed (single language or multiple)
    const allowedLanguages = codingConfig?.language
        ? [codingConfig.language]
        : (Object.keys(LANGUAGE_CONFIG) as ProgrammingLanguage[]);

    return (
        <div className="space-y-6">
            {/* Question metadata header */}
            <QuestionHeader question={question} />

            {/* Question content */}
            <div className="prose prose-sm max-w-none dark:prose-invert">
                <ContentPreview content={(question.question as string) || ""} />
            </div>

            {/* Constraints/Limits */}
            {codingConfig && (codingConfig.timeLimitMs || codingConfig.memoryLimitMb) && (
                <div className="flex flex-wrap gap-3">
                    {codingConfig.timeLimitMs && (
                        <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Time Limit: {codingConfig.timeLimitMs}ms
                        </Badge>
                    )}
                    {codingConfig.memoryLimitMb && (
                        <Badge variant="outline" className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            Memory: {codingConfig.memoryLimitMb}MB
                        </Badge>
                    )}
                </div>
            )}

            {/* Tabs for Code Editor and Test Cases */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="code" className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Code Editor
                    </TabsTrigger>
                    <TabsTrigger value="testcases" className="flex items-center gap-2">
                        <FileCode className="h-4 w-4" />
                        Test Cases ({visibleTestCases.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="code" className="space-y-4">
                    {/* Language selector */}
                    <div className="flex items-center gap-4">
                        <Label htmlFor="language" className="shrink-0">
                            Language:
                        </Label>
                        <Select
                            value={language}
                            onValueChange={(val) =>
                                handleLanguageChange(val as ProgrammingLanguage)
                            }
                            disabled={allowedLanguages.length === 1}
                        >
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {allowedLanguages.map((lang) => (
                                    <SelectItem key={lang} value={lang}>
                                        {LANGUAGE_CONFIG[lang]?.name || lang}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Code editor */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="code-editor">Your Solution</Label>
                            <span className="text-xs text-muted-foreground">
                                {LANGUAGE_CONFIG[language]?.extension || ""}
                            </span>
                        </div>
                        <textarea
                            id="code-editor"
                            value={code}
                            onChange={handleCodeChange}
                            className="w-full min-h-[400px] p-4 font-mono text-sm bg-muted rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                            placeholder={`// Write your ${LANGUAGE_CONFIG[language]?.name || "code"} here...`}
                            spellCheck={false}
                        />
                    </div>

                    {/* Boilerplate code hint */}
                    {codingConfig?.boilerplateCode && (
                        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                            <p className="font-medium mb-2">Note:</p>
                            <p>
                                The code will be wrapped with boilerplate code for input/output
                                handling.
                            </p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="testcases" className="space-y-4">
                    {visibleTestCases.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No visible test cases available.</p>
                            <p className="text-sm">
                                Your code will be tested against hidden test cases upon submission.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {visibleTestCases.map((testCase, index) => (
                                <div
                                    key={testCase.id}
                                    className="border rounded-lg overflow-hidden"
                                >
                                    <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
                                        <span className="font-medium text-sm">
                                            Test Case {index + 1}
                                        </span>
                                        {testCase.marksWeightage && (
                                            <Badge variant="secondary" className="text-xs">
                                                {testCase.marksWeightage} marks
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <div>
                                            <Label className="text-xs text-muted-foreground">
                                                Input
                                            </Label>
                                            <pre className="mt-1 p-2 bg-muted rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                                                {testCase.input || "(empty)"}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Hidden test cases note */}
                    {testCases.length > visibleTestCases.length && (
                        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                            <p>
                                + {testCases.length - visibleTestCases.length} hidden test case(s)
                                will be used for evaluation.
                            </p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
