import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const session = await auth();
        const id = session?.user?.id;
        if (!session?.user?.email || session.user.role != "STUDENT" || !id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const response = await req.json();

        // Use transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // Fetch quiz details first
            const quiz = await tx.quiz.findUnique({
                where: { id: response.quizId },
                select: { startTime: true, endTime: true }
            });

            if (!quiz) {
                throw new Error("Quiz not found");
            }

            const currTime = new Date();
            if (!(currTime >= quiz.startTime && currTime <= quiz.endTime)) {
                throw new Error("Quiz submission window closed");
            }

            // Check for existing submission
            const existing = await tx.quizResult.findUnique({
                where: {
                    studentId_quizId: {
                        studentId: id,
                        quizId: response.quizId
                    }
                }
            });

            if (!existing) {
                throw new Error("No quiz attempt found");
            }

            if (existing.isSubmitted) {
                throw new Error("Quiz already submitted");
            }

            // Get IP address
            let ip = req.ip ||
                req.headers.get('x-forwarded-for')?.split(',')[0] ||
                req.headers.get('x-real-ip') ||
                req.socket?.remoteAddress ||
                req.headers.get('x-real-ip') ||
                req.headers.get('cf-connecting-ip') ||
                req.headers.get('fastly-client-ip') ||
                req.headers.get('true-client-ip') ||
                req.headers.get('x-client-ip') ||
                req.headers.get('x-cluster-client-ip') ||
                req.headers.get('x-forward') ||
                'Unknown IP';

            ip = ip.replace(/^::ffff:/, '');

            // Update the submission with proper error handling
            const updated = await tx.quizResult.update({
                where: {
                    studentId_quizId: {
                        studentId: id,
                        quizId: response.quizId
                    }
                },
                data: {
                    responses: response.responses || {},
                    submittedAt: new Date(),
                    violations: response.violations || '',
                    ip: ip,
                    isSubmitted: true,
                }
            });

            return updated;
        });

        return NextResponse.json({ success: true, data: result });

    } catch (error) {
        console.log('API Error:', error);
        if (error instanceof Error) {
            switch (error.message) {
                case "Quiz already submitted":
                    return NextResponse.json({ error: "Quiz already submitted" }, { status: 400 });
                case "Quiz submission window closed":
                    return NextResponse.json({ error: "Quiz submission window closed" }, { status: 403 });
                case "No quiz attempt found":
                    return NextResponse.json({ error: "No quiz attempt found" }, { status: 404 });
                default:
                    return NextResponse.json({ error: "Failed to save quiz" }, { status: 500 });
            }
        }
        return NextResponse.json({ error: "Failed to save quiz" }, { status: 500 });
    }
}