import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quizResponseTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ quizId: string; studentId: string }> }
) {
    try {
        const { quizId, studentId } = await params;
        const body = await req.json();
        const { score, totalScore, evaluationResult } = body;

        await db
            .update(quizResponseTable)
            .set({
                score: score.toString(),
                totalScore: totalScore.toString(),
                evaluationStatus: "EVALUATED",
                evaluationResults: evaluationResult,
            })
            .where(
                and(
                    eq(quizResponseTable.quizId, quizId),
                    eq(quizResponseTable.studentId, studentId)
                )
            );

        return NextResponse.json({ message: "Evaluation saved successfully" });
    } catch (error) {
        console.error("Error saving evaluation:", error);
        return NextResponse.json({ error: "Failed to save evaluation" }, { status: 500 });
    }
}
