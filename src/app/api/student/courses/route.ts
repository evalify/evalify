import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // const session = await auth();
        // const email = session?.user?.email;
        const email = "cb.ai.u4aid23003@cb.students.amrita.edu"
        if (!email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const student = await prisma.student.findFirst({
            where: {
                user: {
                    email: email
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
        console.error('Error fetching courses:', error);
        return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
    }
}