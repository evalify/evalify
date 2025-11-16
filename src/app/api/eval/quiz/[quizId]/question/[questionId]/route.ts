import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { questionsTable, quizQuestionsTable } from "@/db/schema";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ quizId: string; questionId: string }> }
) {
    try {
        const { quizId, questionId } = await params;

        if (!quizId || !questionId) {
            return NextResponse.json(
                { error: "Quiz ID and Question ID are required" },
                { status: 400 }
            );
        }

        // Fetch the specific question for the quiz (include all question fields)
        const quizQuestion = await db
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
