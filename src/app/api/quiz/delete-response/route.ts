import { auth } from "@/lib/auth/auth";
import { deleteQuizSubmission } from "@/lib/db/minio";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const session = await auth();
        const id = session?.user?.id;

        if (!session?.user?.email || session.user.role !== "STUDENT" || !id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let body;
        try {
            body = await req.json();
        } catch (error) {
            return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
        }

        const { quizId, questionId } = body;
        
        if (!quizId || !questionId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const rollNo = session.user.rollNo || session.user.id;
        await deleteQuizSubmission(quizId, questionId, rollNo);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in delete route:', error);
        return NextResponse.json({ 
            error: "Failed to delete file",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
