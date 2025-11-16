import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { quizQuestionsTable, questionsTable } from "@/db/schema";

export async function GET(req: NextRequest, { params }: { params: Promise<{ quizId: string }> }) {
    try {
        const { quizId } = await params;

        // Fetch all questions for the quiz
        const quizQuestions = await db
            .select({
                questionId: quizQuestionsTable.questionId,
                orderIndex: quizQuestionsTable.orderIndex,
                id: questionsTable.id,
                type: questionsTable.type,
                marks: questionsTable.marks,
                negativeMarks: questionsTable.negativeMarks,
                difficulty: questionsTable.difficulty,
                courseOutcome: questionsTable.courseOutcome,
                bloomTaxonomyLevel: questionsTable.bloomTaxonomyLevel,
                question: questionsTable.question,
                questionData: questionsTable.questionData,
                explaination: questionsTable.explaination,
                solution: questionsTable.solution,
                createdById: questionsTable.createdById,
                created_at: questionsTable.created_at,
                updated_at: questionsTable.updated_at,
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
