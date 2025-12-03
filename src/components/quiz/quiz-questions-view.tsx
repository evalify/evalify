"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Award } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { QuestionRender } from "@/components/question/question-renderer";
import type { Question } from "@/types/questions";

interface QuizQuestionsViewProps {
    quizId: string;
    courseId: string;
}

export function QuizQuestionsView({ quizId, courseId }: QuizQuestionsViewProps) {
    const router = useRouter();

    // Fetch sections
    const { data: sections, isLoading: sectionsLoading } = trpc.section.listByQuiz.useQuery({
        quizId,
        courseId,
    });

    if (sectionsLoading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                ))}
            </div>
        );
    }

    if (!sections || sections.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-lg font-medium text-muted-foreground">No questions found</p>
                    <p className="text-sm text-muted-foreground">
                        This quiz doesn&apos;t have any questions yet.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold">Quiz Questions</h2>
                    <p className="text-sm text-muted-foreground">
                        Click on a question to view details
                    </p>
                </div>
            </div>

            <Accordion type="multiple" defaultValue={sections.map((s) => s.id)}>
                {sections.map((section) => (
                    <SectionQuestions
                        key={section.id}
                        section={section}
                        quizId={quizId}
                        courseId={courseId}
                        onQuestionClick={(questionId) => {
                            router.push(
                                `/course/${courseId}/quiz/${quizId}/results/question/${questionId}`
                            );
                        }}
                    />
                ))}
            </Accordion>
        </div>
    );
}

function SectionQuestions({
    section,
    quizId,
    courseId,
    onQuestionClick,
}: {
    section: { id: string; name: string };
    quizId: string;
    courseId: string;
    onQuestionClick: (questionId: string) => void;
}) {
    const { data: questions, isLoading } = trpc.section.listQuestionsInSection.useQuery({
        sectionId: section.id,
        quizId,
        courseId,
    });

    const totalMarks = useMemo(() => {
        if (!questions) return 0;
        return questions.reduce((sum, q) => sum + (q.marks || 0), 0);
    }, [questions]);

    return (
        <AccordionItem value={section.id} className="border rounded-lg mb-4 px-4">
            <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold">{section.name}</span>
                        <Badge variant="secondary" className="text-xs">
                            {questions?.length || 0}{" "}
                            {(questions?.length || 0) === 1 ? "question" : "questions"}
                        </Badge>
                        {totalMarks > 0 && (
                            <Badge variant="outline" className="text-xs gap-1">
                                <Award className="h-3 w-3" />
                                {totalMarks} marks
                            </Badge>
                        )}
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <div className="space-y-4 pt-4">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(2)].map((_, i) => (
                                <Skeleton key={i} className="h-32 w-full" />
                            ))}
                        </div>
                    ) : questions && questions.length > 0 ? (
                        questions.map((question, index) => (
                            <div
                                key={question.id}
                                className="cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[0.99] rounded-lg"
                                onClick={() => question.id && onQuestionClick(question.id)}
                            >
                                <QuestionRender
                                    question={question as Question}
                                    questionNumber={index + 1}
                                    showMetadata={true}
                                    showSolution={false}
                                    showExplanation={false}
                                    isReadOnly={true}
                                    compareWithStudentAnswer={false}
                                />
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No questions in this section
                        </p>
                    )}
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}
