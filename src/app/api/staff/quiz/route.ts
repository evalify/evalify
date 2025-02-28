import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prismadb";
import { auth } from "@/lib/auth/auth";
import { redis } from "@/lib/db/redis";


async function resetQuizCache(classId: string) {
    await redis.del(`QUIZ_${classId}`);
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.role || (session.user.role !== "STAFF" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        let staffId;

        if (session.user.role === "MANAGER") {
            // For managers, first verify if they can access these courses
            const manager = await prisma.manager.findFirst({
                where: { id: session.user.id },
                include: {
                    class: {
                        include: {
                            courses: true
                        }
                    }
                }
            });

            const managedCourseIds = manager?.class
                .flatMap(cls => cls.courses)
                .map(course => course.id) || [];

            const hasUnauthorizedCourse = body.courseIds?.some(
                (courseId: string) => !managedCourseIds.includes(courseId)
            );

            if (hasUnauthorizedCourse) {
                return NextResponse.json(
                    { message: "Unauthorized: Can only create quizzes for managed courses" },
                    { status: 403 }
                );
            }

            // Get the staff member handling the first course
            if (body.courseIds && body.courseIds.length > 0) {
                const course = await prisma.course.findFirst({
                    where: {
                        id: body.courseIds[0]
                    },
                    include: {
                        staff: true
                    }
                });

                if (!course?.staff) {
                    return NextResponse.json(
                        { error: "No staff assigned to the course. Please assign a staff member first." },
                        { status: 400 }
                    );
                }

                staffId = course.staff.id;
            } else {
                return NextResponse.json(
                    { error: "At least one course must be selected" },
                    { status: 400 }
                );
            }
        } else {
            // For staff members, use their own ID
            const staff = await prisma.staff.findFirst({
                where: {
                    user: {
                        email: session.user.email
                    }
                }
            });

            if (!staff) {
                return NextResponse.json({ error: "Staff not found" }, { status: 404 });
            }

            staffId = staff.id;
        }

        const settings = await prisma.quizSettings.create({
            data: {
                ...body.settings
            }
        });

        const quiz = await prisma.quiz.create({
            data: {
                title: body.title,
                description: body.description,
                startTime: body.startTime,
                endTime: body.endTime,
                duration: body.duration,
                createdbyId: staffId,
                settingsId: settings.id,
                courses: {
                    connect: body.courseIds.map((id: string) => ({ id }))
                }
            }
        });

        body.courseIds.forEach(async (id: string) => {
            const classId = await prisma.course.findUnique({
                where: { id },
                select: { classId: true }
            })
            await redis.del(`QUIZ_${classId?.classId}`);
        })



        return NextResponse.json(quiz);
    } catch (error: any) {
        console.error('API Error:', error?.message || 'Unknown error');
        return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const session = await auth();
        const courseId = new URL(req.url).searchParams.get('courseId');
        if (session?.user.role =="MANAGER" && courseId) {
            const quiz = await prisma.quiz.findMany({
                where: {
                    courses: {
                        some: {
                            id: courseId
                        }
                    }
                },
                include: {
                    settings: true,
                    courses: {
                        include: {
                            class: true
                        }
                    }
                },
                distinct: ['id'],
                orderBy: {
                    startTime: 'desc'
                }
            });

            return NextResponse.json(quiz);
        }

        if (!session?.user?.role || (session.user.role !== "STAFF" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role === "MANAGER") {
            const quizzes = await prisma.quiz.findMany({
                where: {
                    courses: {
                        some: {
                            class: {
                                manager: {
                                    some: {
                                        id: session.user.id
                                    }
                                }
                            }
                        }
                    }
                },
                include: {
                    settings: true,
                    courses: {
                        include: {
                            class: true
                        }
                    }
                },
                distinct: ['id'],
                orderBy: {
                    startTime: 'desc'
                }
            });

            return NextResponse.json(quizzes);
        } else {
            const staff = await prisma.staff.findFirst({
                where: {
                    user: {
                        email: session.user.email
                    }
                }
            });

            if (!staff) {
                return NextResponse.json({ error: "Staff not found" }, {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const quizzes = await prisma.quiz.findMany({
                where: {
                    createdbyId: staff.id
                },
                include: {
                    courses: {
                        include: {
                            class: true,
                        }
                    },
                    settings: true
                }
            })

            return NextResponse.json(quizzes, {
                status: 200,
            });
        }
    } catch (error: any) {
        console.error('API Error:', error?.message || 'Unknown error');
        return NextResponse.json({ error: "Failed to fetch quizzes" }, {
            status: 500,
        });
    }
}

export async function PUT(request: NextRequest) {
    const body = await request.json();
    try {
        if (!body.id || !body.settingsId) {
            return NextResponse.json(
                { error: "Quiz ID and settings ID are required" },
                { status: 400 }
            );
        }

        // Update the quiz settings first
        await prisma.quizSettings.update({
            where: { id: body.settingsId },
            data: {
                fullscreen: body.settings.fullscreen,
                calculator: body.settings.calculator,
                shuffle: body.settings.shuffle,
                autoSubmit: body.settings.autoSubmit,
                showResult: body.settings.showResult
            }
        });

        // Update the quiz with course connections
        const quiz = await prisma.quiz.update({
            where: { id: body.id },
            data: {
                title: body.title,
                description: body.description,
                startTime: new Date(body.startTime),
                endTime: new Date(body.endTime),
                duration: body.duration,
                courses: {
                    set: [], // First disconnect all existing courses
                    connect: body.courseIds.map((id: string) => ({ id }))
                }
            },
            include: {
                courses: true,
                settings: true
            }
        });

        body.courseIds.forEach(async (id: string) => {
            const classId = await prisma.course.findUnique({
                where: { id },
                select: { classId: true }
            })
            await redis.del(`QUIZ_${classId?.classId}`);
        })

        return NextResponse.json(
            { success: true, data: quiz },
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    } catch (error: any) {
        console.error('Update error:', error?.message || 'Unknown error');
        return NextResponse.json(
            {
                success: false,
                error: "Failed to update quiz"
            },
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    }
}

export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
    }

    try {
        // First get the quiz details for cache clearing and validation
        const quiz = await prisma.quiz.findUnique({
            where: { id },
            select: {
                settingsId: true,
                courses: {
                    select: {
                        class: {
                            select: {
                                id: true
                            }
                        }
                    }
                },
                evaluationSetting: true
            }
        });

        if (!quiz) {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }

        // Delete everything in a transaction to ensure data consistency
        await prisma.$transaction(async (tx) => {
            // First delete quiz results if any
            await tx.quizResult.deleteMany({
                where: { quizId: id }
            });

            // Delete evaluation settings if exists
            if (quiz.evaluationSetting) {
                await tx.evaluationSettings.delete({
                    where: { quizId: id }
                });
            }

            // Delete quiz reports if any
            await tx.quizReport.deleteMany({
                where: { quizId: id }
            });

            // Now delete the quiz
            await tx.quiz.delete({
                where: { id }
            });

            // Finally delete the quiz settings
            await tx.quizSettings.delete({
                where: { id: quiz.settingsId }
            });
        });

        // Clear cache for affected classes
        for (const course of quiz.courses) {
            await resetQuizCache(course.class.id);
        }

        return NextResponse.json({
            success: true,
            message: "Quiz deleted successfully"
        });
    } catch (error: any) {
        console.error('Delete error:', error);
        return NextResponse.json({
            success: false,
            error: "Failed to delete quiz"
        }, { status: 500 });
    }
}
