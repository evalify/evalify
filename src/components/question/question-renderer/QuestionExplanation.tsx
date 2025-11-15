import { ContentPreview } from "@/components/rich-text-editor/content-preview";
import { Lightbulb } from "lucide-react";

interface QuestionExplanationProps {
    explanation?: string;
    className?: string;
}

export function QuestionExplanation({ explanation, className }: QuestionExplanationProps) {
    if (!explanation) return null;

    return (
        <div
            className={`p-4 rounded-lg border border-blue-500/50 bg-blue-50 dark:bg-blue-950 ${className}`}
        >
            <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-700 dark:text-blue-400">Explanation</span>
            </div>
            <div className="prose dark:prose-invert max-w-none">
                <ContentPreview content={explanation} />
            </div>
        </div>
    );
}
