"use client";

import { QuestionType } from "@/types/questions";
import { Button } from "@/components/ui/button";
import { CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionTypeSelectorProps {
    selectedType?: QuestionType;
    onSelect: (type: QuestionType) => void;
    disabled?: boolean;
}

const questionTypes: {
    type: QuestionType;
    label: string;
    description: string;
    isDisabled?: boolean;
    isBeta?: boolean;
}[] = [
    {
        type: QuestionType.MCQ,
        label: "Multiple Choice",
        description: "Single or multiple correct answers",
    },
    {
        type: QuestionType.TRUE_FALSE,
        label: "True or False",
        description: "Binary choice question",
    },
    {
        type: QuestionType.FILL_THE_BLANK,
        label: "Fill in the Blanks",
        description: "Complete the sentence",
        isBeta: true,
    },
    {
        type: QuestionType.DESCRIPTIVE,
        label: "Descriptive",
        description: "Long form answer",
    },
    {
        type: QuestionType.MATCHING,
        label: "Match Following",
        description: "Connect related items",
        isBeta: true,
    },
    {
        type: QuestionType.CODING,
        label: "Coding",
        description: "Programming question",
        isBeta: true,
        isDisabled: true,
    },
    {
        type: QuestionType.FILE_UPLOAD,
        label: "File Upload",
        description: "Upload a file as an answer",
        isDisabled: true,
    },
];

export default function QuestionTypeSelector({
    selectedType,
    onSelect,
    disabled,
}: QuestionTypeSelectorProps) {
    const isTypeSelected = (type: QuestionType) => {
        if (type === QuestionType.MCQ) {
            return selectedType === QuestionType.MCQ || selectedType === QuestionType.MMCQ;
        }
        return selectedType === type;
    };

    return (
        <div className="px-4 sm:px-6 py-4 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
            <div className="flex flex-wrap items-center gap-2">
                {questionTypes.map(({ type, label, description, isDisabled, isBeta }) => (
                    <Button
                        key={type}
                        variant={isTypeSelected(type) ? "default" : "outline"}
                        size="sm"
                        onClick={() => onSelect(type)}
                        disabled={disabled || isDisabled}
                        className={cn(
                            "whitespace-nowrap flex items-center gap-2 transition-all duration-200 hover:scale-105",
                            isTypeSelected(type) && "shadow-md ring-2 ring-primary/20"
                        )}
                        title={description}
                    >
                        <span
                            className={cn(
                                "transition-colors",
                                isTypeSelected(type)
                                    ? "text-primary-foreground"
                                    : "text-muted-foreground"
                            )}
                        >
                            <CircleDot className="h-4 w-4" />
                        </span>
                        <span className="font-medium">{label}</span>
                        {isBeta && (
                            <span className="ml-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                                Beta
                            </span>
                        )}
                    </Button>
                ))}
            </div>
        </div>
    );
}
