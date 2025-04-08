import clientPromise from "@/lib/db/mongo";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const quizid = searchParams.get("quizid");
    const questionid = searchParams.get("questionid");

    try {
        if (!quizid) {
            return NextResponse.json({ message: "Missing quizid" }, {
                status: 400,
            });
        }

        const quiz = await prisma.quiz.findUnique({
            where: {
                id: quizid,
            },
            select: {
                title: true,
                id: true,
            },
        });
        const questions = await (await clientPromise).db().collection(
            "NEW_QUESTIONS",
        ).find({
            quizId: quizid,
        }).toArray();

        if (!questionid) {
            return NextResponse.json({
                quiz,
                questions: questions,
            }, { status: 200 });
        }

        const studentAnswer = await prisma.quizResult.findMany({
            where: {
                quizId: quizid,
            },
            select: {
                responses: true,
                id: true,
                student: {
                    select: {
                        user: {
                            select: {
                                name: true,
                                rollNo: true,
                                id: true
                            },
                        },
                    },
                },
            },
            orderBy: {
                student: {
                    user: {
                        rollNo: "asc",
                    },
                },
            },
        }).then((responses) => {
            return responses.map((result) => {
                if (
                    result.responses && typeof result.responses === "object" &&
                    questionid in result.responses
                ) {
                    return {
                        responseId: result.id,
                        ...(result.responses as Record<string, any>)[
                            questionid
                        ],
                        ...result.student.user,
                    };
                }
                return null;
            });
        });

        const selectedQuestion = questions.filter((question) =>
            (question._id as string) == questionid
        );
        return NextResponse.json({
            quiz,
            questions: selectedQuestion,
            studentAnswers: studentAnswer,
        }, { status: 200 });
    } catch (e) {
        return NextResponse.json({ message: "Error" }, { status: 500 });
    }
}
