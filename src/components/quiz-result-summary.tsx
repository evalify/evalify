import { Card, CardContent } from "./ui/card";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

export function QuizResultSummary({ questions, responses }: { 
    questions: any[], 
    responses: Record<string, any> 
}) {
    const summary = questions.reduce((acc, question) => {
        const response = responses?.[question._id];
        if (!response || !response.student_answer?.length || 
            (Array.isArray(response.student_answer) && response.student_answer.every(ans => !ans))) {
            acc.missed++;
        } else if (response.score > 0) {
            acc.correct++;
        } else {
            acc.incorrect++;
        }
        return acc;
    }, { correct: 0, incorrect: 0, missed: 0 });

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardContent className="pt-6 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-semibold">{summary.correct}</span> Correct
                </CardContent>
            </Card>
            <Card>
                <CardContent className="pt-6 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="font-semibold">{summary.incorrect}</span> Incorrect
                </CardContent>
            </Card>
            <Card>
                <CardContent className="pt-6 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="font-semibold">{summary.missed}</span> Not Attempted
                </CardContent>
            </Card>
        </div>
    );
}
