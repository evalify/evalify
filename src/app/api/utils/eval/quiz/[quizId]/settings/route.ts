import { db } from "@/db";
import { quizEvaluationSettingsTable } from "@/db/schema/quiz/quiz-evaluation-settings";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ quizId: string }> }
) {
    try {
        const { quizId } = await params;

        const settings = await db.query.quizEvaluationSettingsTable.findFirst({
            where: eq(quizEvaluationSettingsTable.id, quizId),
        });

        if (!settings) {
            return NextResponse.json({ error: "Settings not found" }, { status: 404 });
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error("Error fetching quiz evaluation settings:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
