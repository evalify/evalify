import { auth } from "@/lib/auth/auth";
import { NextRequest, NextResponse } from "next/server";
import { deleteQuizSubmission } from "@/lib/db/minio";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { quizId, questionId } = body;
        
        if (!quizId || !questionId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const rollNo = session.user.rollNo || session.user.id;
        await deleteQuizSubmission(quizId, questionId, rollNo);

        return NextResponse.json({ success: true });
        
    } catch (error) {
        console.error('Error in delete route:', error);
        return NextResponse.json(
            { error: "Failed to delete file" },
            { status: 500 }
        );
    }
}
