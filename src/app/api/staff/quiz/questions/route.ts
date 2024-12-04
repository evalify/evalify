import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db/mongo";
import { ObjectId } from 'mongodb';

const QUESTIONS_COLLECTION = "NEW_QUESTIONS";
const QUIZ_COLLECTION = "QUIZZES";

export async function GET(request: NextRequest) {
    try {
        const quizId = request.nextUrl.searchParams.get('quizId');

        if (!quizId) {
            return NextResponse.json(
                { error: "Quiz ID is required" },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db();

        // Check if quiz exists, if not initialize it
        const quiz = await db.collection(QUIZ_COLLECTION).findOne({ _id: quizId });
        if (!quiz) {
            await db.collection(QUIZ_COLLECTION).insertOne({
                _id: quizId,
                metadata: {
                    easy: 0,
                    medium: 0,
                    hard: 0
                },
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        const questions = await db
            .collection(QUESTIONS_COLLECTION)
            .find({ quizId })
            .toArray();
        return NextResponse.json(questions);
    } catch (error) {
        console.error('GET Questions Error:', error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { quizId, ...question } = await request.json();
        if (!quizId) {
            return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
        }

        const client = await clientPromise;

        const result = await client
            .db()
            .collection(QUESTIONS_COLLECTION)
            .insertOne({
                ...question,
                quizId,
                createdAt: new Date()
            });

        return NextResponse.json({ success: true, _id: result.insertedId });
    } catch (error) {
        console.error('POST Question Error:', error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { quizId, _id, ...question } = await request.json();

        if (!quizId || !_id) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }
        const questionId = new ObjectId(_id);

        const client = await clientPromise;
        const result = await client
            .db()
            .collection(QUESTIONS_COLLECTION)
            .updateOne(
                {
                    _id: questionId,
                    quizId
                },
                {
                    $set: {
                        ...question,
                        updatedAt: new Date()
                    }
                }
            );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "Question not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('PUT Question Error:', error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { quizId, questionId } = await request.json();

        if (!quizId || !questionId) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        const client = await clientPromise;
        const result = await client
            .db()
            .collection(QUESTIONS_COLLECTION)
            .deleteOne({
                _id: questionId,
                quizId
            });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: "Question not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE Question Error:', error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

