
import { NextResponse } from "next/server";
import clientPromise from "@/lib/db/mongo";
import { auth } from "@/lib/auth/auth";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.role || session.user.role !== "STAFF") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { quizId, questions } = await req.json();
        
        if (!quizId || !Array.isArray(questions)) {
            return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db();

        // Prepare questions for insertion
        const questionsToInsert = questions.map(question => ({
            ...question,
            quizId,
            createdAt: new Date(),
            createdBy: session.user.id
        }));

        // Insert all questions in one operation
        const result = await db.collection('NEW_QUESTIONS').insertMany(questionsToInsert);

        return NextResponse.json({ 
            success: true, 
            count: result.insertedCount 
        });
    } catch (error) {
        console.error('Batch questions error:', error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}