import { NextResponse, NextRequest } from "next/server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quizResponseTable } from "@/db/schema";

export async function GET(req: NextRequest, { params }: { params: Promise<{ quizId: string }> }) {
    try {
        const { quizId } = await params;

        if (!quizId) {
            return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
        }

        // return all responses for the quiz
        const responses = await db
            .select()
            .from(quizResponseTable)
            .where(eq(quizResponseTable.quizId, quizId));

        return NextResponse.json({ responses });
    } catch (error) {
        console.error("Error fetching quiz responses:", error);
        return NextResponse.json({ error: "Failed to fetch quiz responses" }, { status: 500 });
    }
}
