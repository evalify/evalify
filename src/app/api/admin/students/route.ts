import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const classId = searchParams.get("classId");

    try {
        const whereClause: any = {
            user: {
                role: "STUDENT",
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { rollNo: { contains: search, mode: 'insensitive' } },
                ],
            }
        };

        if (classId) {
            whereClause.classId = classId;
        }

        const students = await prisma.student.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        rollNo: true,
                    }
                },
                class: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        });

        const formattedStudents = students
            .filter(student => student.user)
            .map(student => ({
                id: student.user.id,
                name: student.user.name,
                email: student.user.email,
                rollNo: student.user.rollNo || '',
                Student: [{
                    id: student.id,
                    class: student.class
                }]
            }));

        return NextResponse.json(formattedStudents);
    } catch (error) {
        console.error('Error in students API:', error);
        return NextResponse.json([]);
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
