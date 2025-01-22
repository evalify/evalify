import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db/mongo";
import { ObjectId } from 'mongodb';
import { auth } from "@/lib/auth/auth";
import { v4 as uuidv4 } from 'uuid';

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
        console.log('GET Questions Error:', error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const question = await request.json();

        if (!question.quizId) {
            return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
        }

        // Add metadata
        const questionData = {
            _id: uuidv4(),
            ...question,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const client = await clientPromise;
        const result = await client
            .db()
            .collection(QUESTIONS_COLLECTION)
            .insertOne(questionData);

        return NextResponse.json({
            success: true,
            _id: result.insertedId
        });
    } catch (error) {
        // ...error handling...
        console.log(error)
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.role || session.user.role !== "STAFF") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { quizId, _id, ...questionData } = await request.json();

        if (!quizId || !_id) {
            return NextResponse.json({ message: "Quiz ID and Question ID are required" }, { status: 400 });
        }

        // Clean up the question data
        const updatedQuestion = {
            ...questionData,
            question: questionData.content || questionData.question,
            mark: parseInt(questionData.mark?.toString() || '1'),
            updatedAt: new Date()
        };

        // Remove any undefined or null values
        Object.keys(updatedQuestion).forEach(key => 
            (updatedQuestion[key] === undefined || updatedQuestion[key] === null) && delete updatedQuestion[key]
        );

        const client = await clientPromise;
        const result = await client
            .db()
            .collection(QUESTIONS_COLLECTION)
            .updateOne(
                { 
                    _id: _id,
                    quizId 
                },
                { $set: updatedQuestion }
            );

        if (result.matchedCount === 0) {
            return NextResponse.json({ message: "Question not found" }, { status: 404 });
        }

        return NextResponse.json({ 
            message: "Question updated successfully",
            success: true 
        });
    } catch (error) {
        console.error('PUT Question Error:', error);
        return NextResponse.json({ 
            message: "Failed to update question",
            error: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.role || session.user.role !== "STAFF") {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const { quizId, questionId } = await req.json();

        if (!quizId || !questionId) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        const result = await (await clientPromise)
            .db()
            .collection(QUESTIONS_COLLECTION)
            .deleteOne({
                _id: questionId,
                quizId: quizId
            });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { message: "Question not found or already deleted" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: "Question deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error('Delete question error:', error);
        return NextResponse.json(
            { message: "Internal Server Error", error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}

