import { auth } from "@/lib/auth/auth";
import clientPromise from "@/lib/db/mongo";
import { prisma } from "@/lib/db/prismadb";
import { redis } from "@/lib/db/redis";
import { NextResponse } from "next/server";

export async function GET(req: Request) {

    try {
        const session = await auth();
        if (!session && !(session?.user.role === "STUDENT") && !session?.user.email && !session?.user.classId && !session?.user) {
            return NextResponse.json({ status: 401, message: "Unauthorized" });
        }
        const { classId, email } = session.user

        if (!classId) {
            return NextResponse.json({ status: 400, message: "Class not found" });
        }
        if (await redis.get(`QUIZ_${classId}`)) {
            const quizData = await redis.get(`QUIZ_${classId}`);
            return NextResponse.json({ status: 200, data: JSON.parse(quizData || "{}") });
        }

        const quiz = await prisma.quiz.findMany({
            where: {
                courses: {
                    some: {
                        classId
                    }
                }
            },
            select: {
                courses: {
                    where: {
                        classId
                    },
                    select: {
                        staff: {
                            select: {
                                user: {
                                    select: {
                                        name: true,
                                        id: true
                                    }
                                }
                            }
                        }
                    }
                },
                id: true,
                title: true,
                description: true,
                startTime: true,
                endTime: true,
                duration: true,
            },
        });


        const studentId = await prisma.student.findFirst({
            where: {
                user: {
                    email: email
                }
            },
            select: {
                id: true
            }
        })

        if (!studentId) {
            return NextResponse.json({ status: 404, message: "Student not found" });
        }

        const completedQuiz = await prisma.quizResult.findMany({
            where: {
                studentId: studentId.id
            },
            select: {
                quizId: true
            }
        })


        const quizData = quiz.map((q) => {
            return {
                id: q.id,
                title: q.title,
                description: q.description,
                startTime: q.startTime,
                endTime: q.endTime,
                duration: q.duration,
                staff: {
                    name: q.courses[0].staff.user.name,
                    id: q.courses[0].staff.user.id
                }
            }
        })


        await redis.set(`QUIZ_${classId}`, JSON.stringify(quizData), 'EX', 60 * 60 * 4);

        return NextResponse.json({ status: 200, data: quizData });


    } catch (error) {
        console.log("Error fetching quiz", error);
        return NextResponse.json({ status: 500, message: "Internal server error" });

    }


} 