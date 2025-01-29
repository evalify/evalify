import { auth } from "@/lib/auth/auth";
import clientPromise from "@/lib/db/mongo";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";
import { redis, CACHE_KEYS, clearStudentResultCache } from "@/lib/db/redis";

export async function GET(req: Request, { params }: { params: { studentId: string } }) {
    try {
        const param = await params;
        const session = await auth();
        if (!session?.user?.role || session?.user?.role !== 'STAFF') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Try to get from cache
        const cached = await redis.get(CACHE_KEYS.studentResult(param.studentId));
        if (cached) {
            return NextResponse.json(JSON.parse(cached));
        }

        const result = await prisma.quizResult.findUnique({
            where: { id: param.studentId },
            include: {
                student: {
                    select: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                                rollNo: true
                            }
                        }
                    }
                },
                quiz: true
            }
        });

        if (!result) {
            return NextResponse.json({ error: "Result not found" }, { status: 404 });
        }

        const questions = await (await clientPromise).db().collection('NEW_QUESTIONS').find({ quizId: result.quizId }).toArray();

        const response = { result, questions };

        // Cache the response
        await redis.setex(
            CACHE_KEYS.studentResult(param.studentId),
            3600, // 1 hour
            JSON.stringify(response)
        );

        return NextResponse.json(response);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: { studentId: string } }) {
    try {
        const session = await auth();
        const param = await params;

        if (!session?.user?.role || session?.user?.role !== 'STAFF') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { questionId, score, remarks, breakdown } = body;

        const result = await prisma.quizResult.findUnique({
            where: { id: param.studentId },
            select: { responses: true }
        });

        if (!result) {
            return NextResponse.json({ error: "Result not found" }, { status: 404 });
        }

        // Update the specific question's response
        const updatedResponses = {
            ...result.responses,
            [questionId]: {
                ...result.responses[questionId],
                score,
                remarks,
                breakdown
            }
        };

        // Calculate new total score
        const totalScore = Object.values(updatedResponses).reduce(
            (sum: number, response: any) => sum + (Number(response.score) || 0), 
            0
        );

        const updatedResult = await prisma.quizResult.update({
            where: { id: param.studentId },
            data: {
                responses: updatedResponses,
                score: totalScore
            }
        });

        // Clear cache
        await clearStudentResultCache(param.studentId, updatedResult.quizId);

        return NextResponse.json({ result: updatedResult });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}