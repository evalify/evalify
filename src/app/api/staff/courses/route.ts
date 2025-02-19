import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.role || (session.user.role !== "STAFF" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Fetch courses based on role
        if (session.user.role === "MANAGER") {
            const manager = await prisma.manager.findFirst({
                where: { id: session.user.id },
                include: {
                    class: {
                        include: {
                            courses: {
                                include: {
                                    class: true
                                }
                            }
                        }
                    }
                }
            });

            // Flatten courses from all assigned classes
            const courses = manager?.class.flatMap(cls => cls.courses) || [];
            return NextResponse.json(courses);
        } else {
            // Existing staff logic
            const courses = await prisma.course.findMany({
                where: {
                    staffId: session.user.id,
                },
                include: {
                    class: true,
                }
            });
            return NextResponse.json(courses);
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}