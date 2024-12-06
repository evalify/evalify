import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
import { getTime } from "@/lib/utils";
import { NextResponse } from "next/server";

// id          String @id @default (cuid())
// student     Student @relation(fields: [studentId], references: [id])
// studentId   String
// quiz        Quiz @relation(fields: [quizId], references: [id])
// quizId      String
// score       Float
// submittedAt DateTime @default (now())
// responses   Json
// violations  String ?

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

        const save = await prisma.quizResult.create({
            data: {
                studentId: studentId.id,
                quizId: response.quizId,
                score: 0,
                responses: response.responses,
                // submittedAt: getTime(),
                submittedAt: new Date(),
                violations: response.violations,
            }
        })

        return NextResponse.json({ save }, { status: 200 });

    } catch (error) {
        console.log('API Error:', error);
        return NextResponse.json({ error: "Failed to Save quiz" }, { status: 500 });

    }
}