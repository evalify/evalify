import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    // Await the params object before accessing its properties
    const { courseId } = await params;
    
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const student = await prisma.student.findFirst({
      where: {
        user: {
          id: session.user.id
        }
      },
      select: {
        classId: true,
      },
    });

    if (!student?.classId) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check if the course belongs to the student's class
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        classId: student.classId,
        isactive: true
      },
      include: {
        class: true,
        staff: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found or not accessible" }, { status: 404 });
    }

    return NextResponse.json(course);
  } catch (error) {
    console.error("Error fetching course details:", error);
    return NextResponse.json({ error: "Failed to fetch course details" }, { status: 500 });
  }
}