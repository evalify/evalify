import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: { courseId: string } }
) {
    if (!params.courseId) {
        return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const course = await prisma.course.findFirst({
            where: {
                id: params.courseId,
                staff: {
                    user: {
                        email: session.user.email
                    }
                }
            },
            include: {
                class: true
            }
        });

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        return NextResponse.json({ course }, { status: 200 });
    } catch (error) {
        console.error('Error fetching course:', error);
        return NextResponse.json(
            { error: "Failed to fetch course" }, 
            { status: 500 }
        );
    }
}

export { GET as POST };  // Allow POST method
export { GET as PUT };   // Allow PUT method
export { GET as DELETE }; // Allow DELETE method