import { NextResponse, NextRequest } from "next/server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quizzesTable } from "@/db/schema";

export async function GET(req: NextRequest, { params }: { params: Promise<{ quizId: string }> }) {
    try {
        const { quizId } = await params;

        if (!quizId) {
            return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
        }

        // Fetch quiz data from the database
        const quiz = await db
            .select()
            .from(quizzesTable)
            .where(eq(quizzesTable.id, quizId))
            .limit(1);

        if (quiz.length === 0) {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }

        return NextResponse.json({ quiz: quiz[0] });
    } catch (error) {
        console.error("Error fetching quiz data:", error);
        return NextResponse.json({ error: "Failed to fetch quiz data" }, { status: 500 });
    }
}
