import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prismadb";
import { auth } from "@/lib/auth/auth";
import { redis } from "@/lib/db/redis";


async function resetQuizCache(classId: string) {
    await redis.del(`QUIZ_${classId}`);
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    try {
        const staff = await prisma.staff.findFirst({
            where: {
                user: {
                    email: session?.user?.email
                }
            }
        })
        if (!staff) {
            return NextResponse.json({ error: "Staff not found" }, { status: 404 });
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
                createdbyId: staff.id,
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

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

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
        // First delete the quiz settings
        const quiz = await prisma.quiz.findUnique({
            where: { id },
            select: {
                settingsId: true, courses: {
                    select: {
                        class: {
                            select: {
                                id: true
                            }
                        }
                    }
                }
            }
        });

        if (!quiz) {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }

        // Delete the quiz first (this will cascade delete the connections)
        await prisma.quiz.delete({
            where: { id }
        });

        // Then delete the settings
        await prisma.quizSettings.delete({
            where: { id: quiz.settingsId }
        });

        quiz.courses.forEach(async (course: any) => {
            await resetQuizCache(course.class.id);
        });


        return NextResponse.json({ success: true, message: "Quiz deleted successfully" });
    } catch (error: any) {
        console.error('Delete error:', error?.message || 'Unknown error');
        return NextResponse.json({
            success: false,
            error: "Failed to delete quiz"
        }, { status: 500 });
    }
}
