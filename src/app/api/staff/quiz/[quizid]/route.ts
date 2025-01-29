import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prismadb";
import { auth } from "@/lib/auth/auth";

export async function GET(
    request: Request,
    { params }: { params: { quizid: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.email) {  // Changed from role check to email check
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { quizid } = await params;

        const quiz = await prisma.quiz.findUnique({
            where: {
                id: quizid,
            },
            include:{
                courses: {
                    include:{
                        class:true
                    }
                },
                settings: true,
            }
        });

        if (!quiz) {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }

        return NextResponse.json(quiz);
    } catch (error) {
        console.log('API Error:', error);
        return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 });
    }
}
