import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: { classId: string } }
) {
    try {
        const classDetails = await prisma.class.findUnique({
            where: { id: params.classId },
            include: {
                _count: {
                    select: { students: true }
                }
            }
        });

        if (!classDetails) {
            return NextResponse.json({ error: "Class not found" }, { status: 404 });
        }

        return NextResponse.json(classDetails);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch class details" }, { status: 500 });
    }
}