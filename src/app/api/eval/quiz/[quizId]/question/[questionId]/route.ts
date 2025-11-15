import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { questionsTable, quizQuestionsTable } from "@/db/schema";

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const quizId = url.pathname.split("/").slice(-3, -2)[0];
        const questionId = url.pathname.split("/").pop();

        if (!quizId || !questionId) {
            return NextResponse.json(
                { error: "Quiz ID and Question ID are required" },
                { status: 400 }
            );
        }

        // Fetch the specific question for the quiz
        const quizQuestion = await db
            .select({
                questionId: quizQuestionsTable.questionId,
                orderIndex: quizQuestionsTable.orderIndex,
                question: questionsTable.question,
                questionData: questionsTable.questionData,
            })
            .from(quizQuestionsTable)
            .innerJoin(questionsTable, eq(quizQuestionsTable.questionId, questionsTable.id))
            .where(
                and(
                    eq(quizQuestionsTable.quizId, quizId),
                    eq(quizQuestionsTable.questionId, questionId)
                )
            );

        if (quizQuestion.length === 0) {
            return NextResponse.json({ error: "Question not found" }, { status: 404 });
        }

        return NextResponse.json({ data: quizQuestion[0] });
    } catch (error) {
        console.error("Error fetching quiz question:", error);
        return NextResponse.json({ error: "Failed to fetch quiz question" }, { status: 500 });
    }
}
