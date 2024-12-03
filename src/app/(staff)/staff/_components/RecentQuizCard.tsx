import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { FileQuestion, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function RecentQuizCard({ quizzes }: { quizzes: any[] }) {
    return (
        <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Recent Quizzes</h2>
                <Link href="/staff/quizzes" className="text-sm text-blue-600 hover:underline">
                    View all
                </Link>
            </div>
            <div className="space-y-4">
                {quizzes.map((quiz) => (
                    <Link href={`/staff/quiz/${quiz.id}`} key={quiz.id}>
                        <div className="flex items-center justify-between p-4 hover:bg-muted rounded-lg transition-colors">
                            <div className="flex items-center gap-4">
                                <FileQuestion className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <h3 className="font-medium">{quiz.title}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {quiz.courses.length} courses • {formatDistanceToNow(new Date(quiz.startTime))} ago
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </Link>
                ))}
            </div>
        </Card>
    );
}