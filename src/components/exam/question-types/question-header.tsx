"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { QuizQuestion } from "../context/quiz-context";
import { QuestionType, Difficulty, BloomsLevel } from "@/types/questions";
import {
    FileQuestion,
    CheckSquare,
    ToggleLeft,
    PenLine,
    Code,
    Upload,
    List,
    GitCompare,
} from "lucide-react";

interface QuestionHeaderProps {
    question: QuizQuestion;
}

/** Topic information attached to a question */
interface QuestionTopic {
    topicId: string;
    topicName: string;
}

/** Extended question type that may include topics */
type QuestionWithTopics = QuizQuestion & {
    topics?: QuestionTopic[];
};

// Map question types to display names and icons
const QUESTION_TYPE_CONFIG: Record<
    string,
    { label: string; icon: React.ReactNode; color: string }
> = {
    [QuestionType.MCQ]: {
        label: "MCQ",
        icon: <FileQuestion className="h-3 w-3" />,
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    },
    [QuestionType.MMCQ]: {
        label: "Multiple Choice",
        icon: <CheckSquare className="h-3 w-3" />,
        color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    },
    [QuestionType.TRUE_FALSE]: {
        label: "True/False",
        icon: <ToggleLeft className="h-3 w-3" />,
        color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    },
    [QuestionType.DESCRIPTIVE]: {
        label: "Descriptive",
        icon: <PenLine className="h-3 w-3" />,
        color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    },
    [QuestionType.FILL_THE_BLANK]: {
        label: "Fill in Blanks",
        icon: <List className="h-3 w-3" />,
        color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    },
    [QuestionType.MATCHING]: {
        label: "Match",
        icon: <GitCompare className="h-3 w-3" />,
        color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
    },
    [QuestionType.CODING]: {
        label: "Coding",
        icon: <Code className="h-3 w-3" />,
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    },
    [QuestionType.FILE_UPLOAD]: {
        label: "File Upload",
        icon: <Upload className="h-3 w-3" />,
        color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    },
};

// Difficulty colors
const DIFFICULTY_CONFIG: Record<Difficulty, string> = {
    [Difficulty.EASY]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    [Difficulty.MEDIUM]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    [Difficulty.HARD]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

// Bloom's level display names
const BLOOMS_DISPLAY: Record<BloomsLevel, string> = {
    [BloomsLevel.REMEMBER]: "Remember",
    [BloomsLevel.UNDERSTAND]: "Understand",
    [BloomsLevel.APPLY]: "Apply",
    [BloomsLevel.ANALYZE]: "Analyze",
    [BloomsLevel.EVALUATE]: "Evaluate",
    [BloomsLevel.CREATE]: "Create",
};

// Difficulty display names
const DIFFICULTY_DISPLAY: Record<Difficulty, string> = {
    [Difficulty.EASY]: "Easy",
    [Difficulty.MEDIUM]: "Medium",
    [Difficulty.HARD]: "Hard",
};

export function QuestionHeader({ question }: QuestionHeaderProps) {
    const questionType = question.type;
    const typeConfig = QUESTION_TYPE_CONFIG[questionType] || {
        label: String(questionType),
        icon: <FileQuestion className="h-3 w-3" />,
        color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    };

    const difficulty = question.difficulty;
    const difficultyColor = difficulty
        ? DIFFICULTY_CONFIG[difficulty] ||
          "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
        : null;

    // Extract topics from question
    const topics = (question as QuestionWithTopics).topics ?? [];

    return (
        <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b">
            {/* Question Type Badge */}
            <Badge variant="outline" className={`flex items-center gap-1 ${typeConfig.color}`}>
                {typeConfig.icon}
                {typeConfig.label}
            </Badge>

            {/* Difficulty Badge */}
            {difficulty && (
                <Badge variant="outline" className={difficultyColor ?? ""}>
                    {DIFFICULTY_DISPLAY[difficulty]}
                </Badge>
            )}

            {/* Marks Badge */}
            {question.marks != null && (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {question.marks} {question.marks === 1 ? "Mark" : "Marks"}
                </Badge>
            )}

            {/* Negative Marks Badge */}
            {question.negativeMarks != null && question.negativeMarks > 0 && (
                <Badge variant="destructive" className="opacity-80">
                    -{question.negativeMarks}
                </Badge>
            )}

            {/* Topic Badges */}
            {topics.length > 0 && (
                <>
                    {topics.slice(0, 2).map((topic) => (
                        <Badge
                            key={topic.topicId}
                            variant="outline"
                            className="bg-muted text-muted-foreground"
                        >
                            {topic.topicName}
                        </Badge>
                    ))}
                    {topics.length > 2 && (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                            +{topics.length - 2} more
                        </Badge>
                    )}
                </>
            )}

            {/* Course Outcome Badge */}
            {question.courseOutcome && (
                <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">
                    {question.courseOutcome}
                </Badge>
            )}

            {/* Bloom's Taxonomy Level Badge */}
            {question.bloomTaxonomyLevel && (
                <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">
                    {BLOOMS_DISPLAY[question.bloomTaxonomyLevel]}
                </Badge>
            )}
        </div>
    );
}
