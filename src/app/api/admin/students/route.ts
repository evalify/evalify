import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // For dashboard count
    if (searchParams.get("dashboard") === "true") {
        try {
            const total = await prisma.student.count({
                where: { user: { role: "STUDENT" } }
            });
            return NextResponse.json({ total });
        } catch (error) {
            console.log('Error counting students:', error);
            return NextResponse.json({ total: 0 });
        }
    }

    try {
        const whereClause = search ? {
            user: {
                role: "STUDENT",
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { rollNo: { contains: search, mode: 'insensitive' } }
                ]
            }
        } : {
            user: { role: "STUDENT" }
        };

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
            },
            orderBy: {
                user: {
                    name: 'asc'
                }
            },
            ...(search ? {} : { skip, take: limit })
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

        const total = search ? formattedStudents.length : await prisma.student.count({ where: whereClause });

        return NextResponse.json({
            students: formattedStudents,
            total,
            pages: search ? 1 : Math.ceil(total / limit)
        }, { status: 200 });

    } catch (error) {
        console.log('Error in students API:', error);
        return NextResponse.json({
            students: [],
            total: 0,
            pages: 0
        }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { studentIds, classId } = body;

        if (!studentIds || !classId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

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
        return NextResponse.json(
            { error: "Failed to update students" },
            { status: 500 }
        );
    }
}
