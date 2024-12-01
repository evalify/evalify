import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    try {
        const students = await prisma.user.findMany({
            where: {
                role: "STUDENT",
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { rollNo: { contains: search, mode: 'insensitive' } },
                ],
            },
            include: {
                Student: {
                    include: {
                        class: true
                    }
                }
            }
        });

        return NextResponse.json(students || []);
    } catch (error) {
        console.error('Error fetching students:', error);
        return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const { studentIds, classId } = await req.json();

    try {
        await prisma.student.updateMany({
            where: {
                userId: {
                    in: studentIds
                }
            },
            data: {
                classId
            }
        });
        return NextResponse.json({ message: "Students updated successfully" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update students" }, { status: 500 });
    }
}
