import { auth } from "@/lib/auth/auth";
import clientPromise from "@/lib/db/mongo";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { quizId: string } }) {
    try {
        const param = await params;
        const session = await auth();
        if (!session?.user?.id || session?.user?.role !== 'STUDENT') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const result = await prisma.quizResult.findFirst({
            where: {
                student:{
                    userId: session.user.id
                },
                quizId: param.quizId
            },
            include: {
                student: {
                    select: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                                rollNo: true
                            }
                        }
                    }
                },
                quiz: {
                    include: {
                        settings: true
                    }
                }
            }
        });

        if (!result) {
            return NextResponse.json({ error: "Result not found" }, { status: 404 });
        }

        const questions = await (await clientPromise).db().collection('NEW_QUESTIONS').find({ quizId: result.quizId }).toArray();

        return NextResponse.json({ result, questions });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
