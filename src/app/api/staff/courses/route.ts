import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const staff = await prisma.staff.findFirst({
            where: {
                user: {
                    email: session.user.email
                }
            },
            include: {
                courses: {
                    where: {
                        isactive: true
                    },
                    include: {
                        class: true
                    }
                }
            }
        });

        if (!staff) {
            return NextResponse.json({ error: "Staff not found" }, { status: 404 });
        }

        const courses = await prisma.course.findMany({
            where: {
                staffId: staff.id,
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