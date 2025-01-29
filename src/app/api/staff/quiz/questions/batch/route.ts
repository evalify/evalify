import { NextResponse } from "next/server";
import clientPromise from "@/lib/db/mongo";
import { auth } from "@/lib/auth/auth";
import { generateQuestionHash } from '@/utils/questionHash';

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
        const questionsToInsert = questions.map(q => ({
            ...q,
            quizId,
            questionHash: generateQuestionHash(q.question || q.content, q.type),
        }));

        // Check for duplicates using questionHash
        const existingHashes = await db.collection('NEW_QUESTIONS')
            .find({
                quizId,
                questionHash: { $in: questionsToInsert.map(q => q.questionHash) }
            })
            .project({ questionHash: 1 })
            .toArray();

        // Filter out questions that already exist
        const uniqueQuestions = questionsToInsert.filter(q =>
            !existingHashes.some(existing => existing.questionHash === q.questionHash)
        );

        if (uniqueQuestions.length > 0) {
            await db.collection('NEW_QUESTIONS').insertMany(uniqueQuestions);
        }

        return NextResponse.json({
            success: true,
            count: uniqueQuestions.length
        });
    } catch (error) {
        console.error('Batch questions error:', error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}