"use client";
import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TiptapRenderer from "@/components/ui/tiptap-renderer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props = {
    params: {
        quizid: string;
    };
};

function page({ params }: Props) {
    const unwrappedParams = use(params);
    const { quizid } = unwrappedParams;
    const [question, setQuestion] = useState<any>(null);
    const [quiz, setQuiz] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const router = useRouter();

    useEffect(() => {
        fetch(`/api/staff/result/question?quizid=${quizid}`).then((res) => {
            if (res.ok) {
                res.json().then((data) => {
                    setQuiz(data.quiz || {});
                    setQuestion(data.questions || []);
                });
            } else {
                console.log("Error fetching questions");
            }
        });
    }, []);

    const handleQuestionClick = (questionId: string) => {
        router.push(`/staff/quiz/result/${quizid}/question/${questionId}`);
    };

    // Filter questions based on search query
    const filteredQuestions = question
        ? question.filter((q: any) => {
            const questionText = q.question?.toLowerCase() || "";
            const questionType = q.type?.toLowerCase() || "";
            const query = searchQuery.toLowerCase();

            // Check if the query is contained in the question text or type
            return questionText.includes(query) || questionType.includes(query);
        })
        : [];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center ">
                <Button
                    variant="ghost"
                    className="mb-4"
                    onClick={() => {
                        router.back();
                    }}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <h1 className="text-2xl font-bold mb-6">
                    {quiz && quiz.title}
                </h1>
            </div>

            {/* Search input */}
            <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="w-4 h-4 text-gray-500" />
                </div>
                <Input
                    type="text"
                    placeholder="Search questions by content or type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            <div className="space-y-4">
                {question
                    ? (
                        filteredQuestions.length > 0
                            ? filteredQuestions.map((
                                question: any,
                                index: number,
                            ) => (
                                <div
                                    key={question._id}
                                    onClick={() =>
                                        handleQuestionClick(question._id)}
                                    className="p-4 border rounded-lg shadow hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                                >
                                    <div className="flex justify-between items-center pr-5">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center justify-center bg-blue-100 text-blue-800 rounded-full h-8 w-8 font-semibold">
                                                    {index + 1}
                                                </span>
                                                <h2 className="text-lg font-medium">
                                                    <TiptapRenderer
                                                        content={question
                                                            .question}
                                                    />
                                                </h2>
                                            </div>
                                            <div className="mt-2 text-sm text-gray-500">
                                                Type: {question.type}
                                            </div>
                                        </div>

                                        <div className="justify-center items-center text-center">
                                            Mark: {question.mark}
                                        </div>
                                    </div>
                                </div>
                            ))
                            : (
                                <p className="text-center py-8">
                                    No questions match your search
                                </p>
                            )
                    )
                    : <p className="text-center py-8">Loading questions...</p>}
            </div>
        </div>
    );
}

export default page;
