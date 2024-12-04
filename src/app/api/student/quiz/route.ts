import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function GET(req: Request) {

    try {
        const session = await auth();
        if (!session && !(session?.user.role === "STUDENT")) {
            return NextResponse.json({ status: 401, message: "Unauthorized" });
        }
        const { classId } = session.user

        if (!classId) {
            return NextResponse.json({ status: 400, message: "Class not found" });
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

        return NextResponse.json({ status: 200, data: quizData });


    } catch (error) {
        console.log("Error fetching quiz", error);
        return NextResponse.json({ status: 500, message: "Internal server error" });

    }


} 