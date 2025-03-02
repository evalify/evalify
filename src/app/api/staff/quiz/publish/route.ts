import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prismadb";
import { auth } from "@/lib/auth/auth";


export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.role || (session.user.role !== "STAFF" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { quizId, courseIds } = body;

        if (!quizId || !courseIds || !Array.isArray(courseIds)) {
            return NextResponse.json(
                { error: "Invalid request body" },
                { status: 400 }
            );
        }

        const result = await prisma.quiz.update({
            where: {
                id: quizId
            },
            data: {
                courses: {
                    set: [],
                    connect: courseIds.map((id: string) => ({ id }))
                }
            }
        })

        if (!result){
            return NextResponse.json({ error: "Failed to publish quiz" }, { status: 500 });
        }


        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error publishing quiz:", error);
        return NextResponse.json(
            { error: "Failed to publish quiz" },
            { status: 500 }
        );
    }
}
