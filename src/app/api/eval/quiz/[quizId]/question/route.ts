import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { quizQuestionsTable, questionsTable } from "@/db/schema";

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const quizId = url.pathname.split("/").slice(-2, -1)[0];

        if (!quizId) {
            return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
        }

        // Fetch all questions for the quiz
        const quizQuestions = await db
            .select({
                questionId: quizQuestionsTable.questionId,
                orderIndex: quizQuestionsTable.orderIndex,
                question: questionsTable.question,
                questionData: questionsTable.questionData,
            })
            .from(quizQuestionsTable)
            .innerJoin(questionsTable, eq(quizQuestionsTable.questionId, questionsTable.id))
            .where(eq(quizQuestionsTable.quizId, quizId));

        return NextResponse.json({ data: quizQuestions });
    } catch (error) {
        console.error("Error fetching quiz questions:", error);
        return NextResponse.json({ error: "Failed to fetch quiz questions" }, { status: 500 });
    }
}
