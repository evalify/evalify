import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";
import { and } from "drizzle-orm";
import { db } from "@/db";
import { quizResponseTable } from "@/db/schema";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ quizId: string; studentId: string }> }
) {
    try {
        const { quizId, studentId } = await params;

        if (!quizId || !studentId) {
            return NextResponse.json(
                { error: "Quiz ID and Student ID are required" },
                { status: 400 }
            );
        }

        const resp = await db
            .select()
            .from(quizResponseTable)
            .where(
                and(
                    eq(quizResponseTable.quizId, quizId),
                    eq(quizResponseTable.studentId, studentId)
                )
            )
            .limit(1);

        if (resp.length === 0) {
            return NextResponse.json({ error: "Quiz response not found" }, { status: 404 });
        }

        return NextResponse.json({ response: resp[0] });
    } catch (error) {
        console.error("Error fetching quiz response:", error);
        return NextResponse.json({ error: "Failed to fetch quiz response" }, { status: 500 });
    }
}
