"use client";

import { useState } from "react";
import { Question, BloomsLevel, Difficulty, CourseOutcome } from "@/types/questions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Settings, Hash, BrainCircuit, Target, Tags, Gauge } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface QuestionSettingsProps {
    value: Question;
    onChange: (question: Question) => void;
    context?: "bank" | "quiz";
    bankId?: string;
}

export default function QuestionSettings({
    value,
    onChange,
    context = "quiz",
    bankId,
}: QuestionSettingsProps) {
    const [newTopicInput, setNewTopicInput] = useState("");

    // Fetch bank topics if in bank context
    const { data: bankData } = trpc.bank.get.useQuery(
        { id: bankId! },
        { enabled: context === "bank" && !!bankId }
    );

    const availableTopics = context === "bank" ? (bankData?.topics as string[]) || [] : [];

    const handleMarksChange = (marks: string) => {
        const parsed = parseFloat(marks);
        if (!isNaN(parsed) && parsed >= 0) {
            onChange({ ...value, marks: parsed });
        }
    };

    const handleNegativeMarksChange = (negativeMarks: string) => {
        const parsed = parseFloat(negativeMarks);
        if (!isNaN(parsed) && parsed >= 0) {
            onChange({ ...value, negativeMarks: parsed });
        }
    };

    const handleBloomLevelChange = (bloomsLevel: BloomsLevel) => {
        onChange({ ...value, bloomsLevel });
    };

    const handleDifficultyChange = (difficulty: Difficulty) => {
        onChange({ ...value, difficulty });
    };

    const handleCourseOutcomeChange = (courseOutcome: string) => {
        onChange({
            ...value,
            courseOutcome: courseOutcome === "none" ? undefined : (courseOutcome as CourseOutcome),
        });
    };

    const handleAddTopic = () => {
        if (!newTopicInput.trim()) return;

        const currentTopics = value.topics || [];
        const newTopic = { topicId: `temp-${Date.now()}`, topicName: newTopicInput.trim() };

        if (!currentTopics.some((t) => t.topicName === newTopic.topicName)) {
            onChange({
                ...value,
                topics: [...currentTopics, newTopic],
            });
        }
        setNewTopicInput("");
    };

    const handleAddBankTopic = (topicName: string) => {
        if (!topicName.trim()) return;

        const currentTopics = value.topics || [];
        const newTopic = { topicId: `temp-${Date.now()}`, topicName: topicName.trim() };

        if (!currentTopics.some((t) => t.topicName === newTopic.topicName)) {
            onChange({
                ...value,
                topics: [...currentTopics, newTopic],
            });
        }
    };

    const handleRemoveTopic = (topicId: string) => {
        onChange({
            ...value,
            topics: (value.topics || []).filter((t) => t.topicId !== topicId),
        });
    };

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Question Settings
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-0">
                <div className="space-y-3">
                    <Label htmlFor="marks" className="text-sm font-medium flex items-center gap-2">
                        <Hash className="h-4 w-4 text-blue-500" />
                        Marks *
                    </Label>
                    <Input
                        id="marks"
                        type="number"
                        min={0}
                        step={0.5}
                        placeholder="1"
                        value={value.marks}
                        onChange={(e) => handleMarksChange(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-3">
                    <Label
                        htmlFor="negativeMarks"
                        className="text-sm font-medium flex items-center gap-2"
                    >
                        <Hash className="h-4 w-4 text-red-500" />
                        Negative Marks
                    </Label>
                    <Input
                        id="negativeMarks"
                        type="number"
                        min={0}
                        step={0.5}
                        placeholder="0"
                        value={value.negativeMarks}
                        onChange={(e) => handleNegativeMarksChange(e.target.value)}
                    />
                </div>

                <div className="space-y-3">
                    <Label
                        htmlFor="bloomLevel"
                        className="text-sm font-medium flex items-center gap-2"
                    >
                        <BrainCircuit className="h-4 w-4 text-purple-500" />
                        Bloom&apos;s Taxonomy Level
                    </Label>
                    <Select
                        value={value.bloomsLevel || ""}
                        onValueChange={(val) => handleBloomLevelChange(val as BloomsLevel)}
                    >
                        <SelectTrigger id="bloomLevel">
                            <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.values(BloomsLevel).map((level) => (
                                <SelectItem key={level} value={level}>
                                    {level}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label
                        htmlFor="difficulty"
                        className="text-sm font-medium flex items-center gap-2"
                    >
                        <Gauge className="h-4 w-4 text-amber-500" />
                        Difficulty Level
                    </Label>
                    <Select
                        value={value.difficulty || ""}
                        onValueChange={(val) => handleDifficultyChange(val as Difficulty)}
                    >
                        <SelectTrigger id="difficulty">
                            <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={Difficulty.EASY}>
                                <span className="text-green-600 dark:text-green-400 font-medium">
                                    Easy
                                </span>
                            </SelectItem>
                            <SelectItem value={Difficulty.MEDIUM}>
                                <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                                    Medium
                                </span>
                            </SelectItem>
                            <SelectItem value={Difficulty.HARD}>
                                <span className="text-red-600 dark:text-red-400 font-medium">
                                    Hard
                                </span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label
                        htmlFor="courseOutcome"
                        className="text-sm font-medium flex items-center gap-2"
                    >
                        <Target className="h-4 w-4 text-green-500" />
                        Course Outcome (CO)
                    </Label>
                    <Select
                        value={value.courseOutcome || "none"}
                        onValueChange={handleCourseOutcomeChange}
                    >
                        <SelectTrigger id="courseOutcome">
                            <SelectValue placeholder="Select CO" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {Object.values(CourseOutcome).map((co) => (
                                <SelectItem key={co} value={co}>
                                    {co}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <div>
                        <Label className="text-sm font-medium flex items-center gap-2">
                            <Tags className="h-4 w-4 text-orange-500" />
                            Topics
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                            {context === "bank"
                                ? "Select from predefined bank topics"
                                : "Add custom topics for this quiz question"}
                        </p>
                    </div>

                    {/* For Bank: Show dropdown of predefined topics */}
                    {context === "bank" && availableTopics.length > 0 && (
                        <div className="space-y-2">
                            <Select
                                value="__placeholder__"
                                onValueChange={(val) => {
                                    if (val !== "__placeholder__") handleAddBankTopic(val);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select topic from bank" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__placeholder__" disabled>
                                        Select a topic
                                    </SelectItem>
                                    {availableTopics
                                        .filter(
                                            (topic: string) =>
                                                !(value.topics || []).some(
                                                    (t) => t.topicName === topic
                                                )
                                        )
                                        .map((topic: string) => (
                                            <SelectItem key={topic} value={topic}>
                                                {topic}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* For Quiz: Show input to add custom topics */}
                    {context === "quiz" && (
                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter topic name"
                                value={newTopicInput}
                                onChange={(e) => setNewTopicInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddTopic();
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                onClick={handleAddTopic}
                                disabled={!newTopicInput.trim()}
                                size="sm"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add
                            </Button>
                        </div>
                    )}

                    {/* Display selected topics */}
                    {value.topics && value.topics.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {value.topics.map((topic) => (
                                <Badge
                                    key={topic.topicId}
                                    variant="secondary"
                                    className="pl-2 pr-1"
                                >
                                    {topic.topicName}
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRemoveTopic(topic.topicId)}
                                        className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
