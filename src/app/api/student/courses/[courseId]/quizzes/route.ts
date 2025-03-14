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
    if (!session?.user?.id || session?.user?.role !== 'STUDENT') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get student information
    const student = await prisma.student.findFirst({
      where: {
        user: {
          id: session.user.id
        }
      },
      select: {
        id: true,
        classId: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get the course and verify it belongs to the student's class
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        ...(student.classId ? { classId: student.classId } : {}),
        isactive: true
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found or not accessible" }, { status: 404 });
    }

    // Alternative approach: Start from QuizResult table to get all quizzes
    // This gets completed quizzes with scores
    const quizResults = await prisma.quizResult.findMany({
      where: {
        studentId: student.id,
      },
      include: {
        quiz: {
          include: {
            settings: true,
            courses: {
              where: {
                id: courseId
              },
              select: {
                staff: {
                  select: {
                    user: {
                      select: {
                        name: true,
                        id: true
                      }
                    }
                  }
                }
              }
            },
          },
        }
      }
    });

    // Now get all quizzes for the course (to include quizzes student hasn't taken)
    const coursesWithQuizzes = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
      include: {
        quizzes: {
          include: {
            settings: true,
            createdby: {
              include: {
                user: {
                  select: {
                    name: true,
                    id: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!coursesWithQuizzes) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const allQuizzes = coursesWithQuizzes.quizzes;

    // Combine the data and format it
    const formattedQuizzes = allQuizzes.map(quiz => {
      const now = new Date();
      const start = new Date(quiz.startTime);
      const end = new Date(quiz.endTime);
      
      // Find the result for this quiz if it exists
      const result = quizResults.find(r => r.quizId === quiz.id);
      
      let status;
      let showResult = false;
      
      if (result && result.isSubmitted) {
        status = "completed";
        showResult = (quiz.settings?.showResult && result.isEvaluated === "EVALUATED") || false;
      } else if (now >= start && now <= end) {
        status = "live";
      } else if (now > end) {
        status = "missed";
      } else {
        status = "upcoming";
      }

      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        startTime: quiz.startTime,
        endTime: quiz.endTime,
        duration: quiz.duration,
        status,
        showResult,
        score: result?.score,
        totalScore: result?.totalScore,
        staff: {
          name: quiz.createdby?.user?.name || "Unknown",
          id: quiz.createdby?.user?.id || ""
        }
      };
    });

    return NextResponse.json(formattedQuizzes);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error fetching course quizzes:", errorMessage);
    return NextResponse.json({ error: "Failed to fetch quizzes" }, { status: 500 });
  }
}