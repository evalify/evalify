import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
import { getTime } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const response = await req.json();

        const studentId = await prisma.student.findFirst({
            where: {
                user: {
                    email: session?.user?.email
                },
            }, select: {
                id: true
            }
        })
        if (!studentId) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        // Check if student has already submitted this quiz
        const existingSubmission = await prisma.quizResult.findFirst({
            where: {
                studentId: studentId.id,
                quizId: response.quizId
            }
        });

        if (existingSubmission) {
            return NextResponse.json({ error: "Quiz already submitted" }, { status: 400 });
        }

        const save = await prisma.quizResult.create({
            data: {
                studentId: studentId.id,
                quizId: response.quizId,
                score: 0,
                responses: response.responses,
                submittedAt: new Date(),
                violations: response.violations,
                ip : req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || req.headers.get('fastly-client-ip') || req.headers.get('true-client-ip') || req.headers.get('x-client-ip') || req.headers.get('x-cluster-client-ip') || req.headers.get('x-forward') || "none"
            }
        })

        return NextResponse.json({ save }, { status: 200 });

    } catch (error) {
        console.log('API Error:', error);
        return NextResponse.json({ error: "Failed to Save quiz" }, { status: 500 });

    }
}