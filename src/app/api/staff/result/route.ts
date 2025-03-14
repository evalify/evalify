import { auth } from "@/lib/auth/auth";
import clientPromise from "@/lib/db/mongo";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";
// import { redis, CACHE_KEYS, clearQuizCache } from "@/lib/db/redis";

export async function GET(req: Request) {
    try {
        const session = await auth();

        
        
        if (!session?.user?.role || (session?.user?.role !== 'STAFF' && session?.user?.role !== 'MANAGER')) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        const { searchParams } = new URL(req.url);
        const quizid = searchParams.get('quizid');


        // // Try to get from cache first
        // const cached = await redis.get(CACHE_KEYS.quizResults(quizid));
        // if (cached) {
        //     return NextResponse.json(JSON.parse(cached));
        // }

        if (!quizid) {
            return NextResponse.json({ error: "QuizID not found" }, { status: 404 });
        }

        const quiz = await prisma.quiz.findUnique({
            where: {
                id: quizid
            },
            include: {
                QuizReport: true,
                settings: {
                    select: {
                        showResult: true
                    }
                },
            }
        });

        const questions = await (await clientPromise).db().collection('NEW_QUESTIONS').find({ quizId: quizid }).toArray();


        const quizResults = await prisma.quizResult.findMany({
            where: {
                quizId: quizid
            },
            include: {
                student: {
                    select: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                                id: true,
                                rollNo: true
                            }
                        }
                    }
                }
            }
        })

        const response = { quiz, quizResults, questions };

        // // Cache the response
        // await redis.setex(
        //     CACHE_KEYS.quizResults(quizid),
        //     3600, // 1 hour
        //     JSON.stringify(response)
        // );

        return NextResponse.json(response);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.role || (session?.user?.role !== 'STAFF' && session?.user?.role !== 'MANAGER')) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { quizId } = body;


        if (!quizId) {
            return NextResponse.json({ error: "QuizID is required" }, { status: 400 });
        }

        const URL = `${process.env.EVALUATION_API}/evaluate`;
        console.log({ quizId, URL });
        
        await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ quiz_id: quizId })
        })

        return NextResponse.json({ success: true });

    } catch (error) {
        console.log('Evaluation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}