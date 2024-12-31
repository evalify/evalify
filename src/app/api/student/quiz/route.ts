import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
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
        // if (await redis.get(`QUIZ_${email}`)) {
        //     const quizData = await redis.get(`QUIZ_${classId}`);
        //     return NextResponse.json({ status: 200, data: JSON.parse(quizData || "{}") });
        // }

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


        const completedQuiz = await prisma.quizResult.findMany({
            where: {
                student: {
                    user: {
                        email: email
                    }
                }
            },
            select: {
                quizId: true,
                quiz: {
                    select: {
                        settings: {
                            select: {
                                showResult: true
                            }
                        }
                    }
                }
            }
        })


        const quizData = quiz.map((q) => {
            const now = new Date();
            const start = new Date(q.startTime);
            const end = new Date(q.endTime);

            let status;
            let showResult = false;

            if (completedQuiz.some(cq => cq.quizId === q.id)) {
                status = "completed";
                showResult = completedQuiz.find((cq) => cq.quizId === q.id)?.quiz.settings.showResult || false;
            } else if (now >= start && now <= end) {
                status = "live";
            } else if (now > end) {
                status = "missed";
            } else {
                status = "upcoming";
            }

            return {
                id: q.id,
                title: q.title,
                description: q.description,
                startTime: q.startTime,
                endTime: q.endTime,
                duration: q.duration,
                status,
                showResult,
                staff: {
                    name: q.courses[0].staff.user.name,
                    id: q.courses[0].staff.user.id
                }
            };
        });

        // await redis.set(`QUIZ_${classId}`, JSON.stringify(quizData), 'EX', 60 * 60 * 4);

        return NextResponse.json({ status: 200, data: quizData });


    } catch (error) {
        console.log("Error fetching quiz", error);
        return NextResponse.json({ status: 500, message: "Internal server error" });

    }


}