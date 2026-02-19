"use client";
import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

type ScoringMethodProps = {
    data: {
        mcqGlobalPartialMarking: boolean;
        mcqGlobalNegativeMark?: number;
        mcqGlobalNegativePercent?: number;
        codingGlobalPartialMarking: boolean;
        llmEvaluationEnabled: boolean;
        llmProvider?: string;
        llmModelName?: string;
        fitbLlmSystemPrompt?: string;
        descLlmSystemPrompt?: string;
    };
    updateData: (data: ScoringMethodProps["data"]) => void;
};

export function ScoringMethod({ data, updateData }: ScoringMethodProps) {
    const handleSwitchChange = (key: keyof ScoringMethodProps["data"]) => (checked: boolean) => {
        updateData({ ...data, [key]: checked });
    };

    const handleInputChange =
        (key: keyof ScoringMethodProps["data"], isNumber = false) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const value = isNumber ? parseFloat(e.target.value) : e.target.value;
            updateData({ ...data, [key]: isNumber && isNaN(value as number) ? undefined : value });
        };

    const handleSelectChange = (key: keyof ScoringMethodProps["data"]) => (value: string) => {
        updateData({ ...data, [key]: value });
    };

    return (
        <div className="space-y-8">
            {/* MCQ Settings */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">MCQ Evaluation Settings</h3>
                <div className="grid gap-4">
                    <div className="flex justify-between space-x-2 border p-4 rounded-lg">
                        <div className="flex flex-col space-y-1">
                            <span>Partial Marking</span>
                            <span className="font-normal text-sm text-muted-foreground">
                                Enable partial marking for multiple choice questions
                                <br />
                                <span className="font-semibold">
                                    Marks will be evenly distributed based on the number of correct
                                    options
                                </span>
                            </span>
                        </div>
                        <Switch
                            id="mcq-partial"
                            checked={data.mcqGlobalPartialMarking}
                            onCheckedChange={handleSwitchChange("mcqGlobalPartialMarking")}
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Negative Marking Type</Label>
                            <RadioGroup
                                defaultValue={
                                    data.mcqGlobalNegativePercent !== undefined &&
                                    data.mcqGlobalNegativePercent !== null
                                        ? "percentage"
                                        : "fixed"
                                }
                                onValueChange={(value) => {
                                    if (value === "fixed") {
                                        updateData({
                                            ...data,
                                            mcqGlobalNegativePercent: undefined,
                                            mcqGlobalNegativeMark: 0,
                                        });
                                    } else {
                                        updateData({
                                            ...data,
                                            mcqGlobalNegativeMark: undefined,
                                            mcqGlobalNegativePercent: 0,
                                        });
                                    }
                                }}
                                className="flex flex-row space-x-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="fixed" id="fixed" />
                                    <Label htmlFor="fixed">Fixed Value</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="percentage" id="percentage" />
                                    <Label htmlFor="percentage">Percentage</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {data.mcqGlobalNegativePercent === undefined ||
                        data.mcqGlobalNegativePercent === null ? (
                            <div className="space-y-2">
                                <Label htmlFor="negative-mark">Negative Mark (Fixed Value)</Label>
                                <Input
                                    id="negative-mark"
                                    type="number"
                                    min={0}
                                    placeholder="e.g. 1"
                                    value={data.mcqGlobalNegativeMark ?? ""}
                                    onChange={handleInputChange("mcqGlobalNegativeMark", true)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Points deducted for each wrong answer
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label htmlFor="negative-percent">Negative Mark (Percentage)</Label>
                                <Input
                                    id="negative-percent"
                                    type="number"
                                    placeholder="e.g. 25"
                                    value={data.mcqGlobalNegativePercent ?? ""}
                                    onChange={handleInputChange("mcqGlobalNegativePercent", true)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Percentage of question marks deducted (0-100)
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Separator />

            {/* Coding Settings */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Coding Evaluation Settings</h3>
                <div className="flex justify-between space-x-2 border p-4 rounded-lg">
                    <div className="flex flex-col space-y-1">
                        <span>Partial Marking</span>
                        <span className="font-normal text-sm text-muted-foreground">
                            Enable partial marking based on test cases passed
                            <br />
                            <span className="font-semibold">
                                Marks will be evenly distributed based on the number of testcases.
                            </span>
                        </span>
                    </div>
                    <Switch
                        id="coding-partial"
                        checked={data.codingGlobalPartialMarking}
                        onCheckedChange={handleSwitchChange("codingGlobalPartialMarking")}
                    />
                </div>
            </div>

            <Separator />

            {/* LLM Settings */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">AI Evaluation Settings</h3>
                    <Switch
                        checked={data.llmEvaluationEnabled}
                        onCheckedChange={handleSwitchChange("llmEvaluationEnabled")}
                        disabled
                    />
                </div>

                {data.llmEvaluationEnabled && (
                    <div className="grid gap-6 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Provider</Label>
                                <Select
                                    value={data.llmProvider}
                                    onValueChange={handleSelectChange("llmProvider")}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="vllm">VLLM - (Self-Hosted)</SelectItem>
                                        <SelectItem value="openai">OpenAI</SelectItem>
                                        <SelectItem value="anthropic">Anthropic</SelectItem>
                                        <SelectItem value="google">Google</SelectItem>
                                        <SelectItem value="azure">Azure OpenAI</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Model Name</Label>
                                <Input
                                    placeholder="e.g. gpt-4o"
                                    value={data.llmModelName ?? ""}
                                    onChange={handleInputChange("llmModelName")}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Fill in the Blanks System Prompt</Label>
                            <Textarea
                                placeholder="System prompt for evaluating FITB questions..."
                                value={data.fitbLlmSystemPrompt ?? ""}
                                onChange={handleInputChange("fitbLlmSystemPrompt")}
                                className="min-h-[100px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Descriptive System Prompt</Label>
                            <Textarea
                                placeholder="System prompt for evaluating descriptive questions..."
                                value={data.descLlmSystemPrompt ?? ""}
                                onChange={handleInputChange("descLlmSystemPrompt")}
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
