import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await auth();

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const student = await prisma.student.findFirst({
            where: {
                user: {
                    id:session.user.id
                }
            },
            select: {
                classId: true,
            },
        });

        if (!student?.classId) {
            return NextResponse.json({ error: "Student/Class not found" }, { status: 404 });
        }

        const courses = await prisma.course.findMany({
            where: {
                classId: student.classId,
                isactive: true
            },
            include: {
                class: true
            }
        });

        return NextResponse.json(courses);
    } catch (error) {
        console.log('Error fetching courses:', error);
        return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
    }
}