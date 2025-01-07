import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
import { redis, CACHE_KEYS } from "@/lib/db/redis";
import { NextResponse } from "next/server";

export async function GET() {
    const now = new Date();

    try {
        const session = await auth();
        if (!session?.user?.id || session?.user?.role !== 'STUDENT') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const cacheKey = CACHE_KEYS.studentDashboard(session.user.id);
        const cached = await redis.get(cacheKey);
        if (cached) {
            return NextResponse.json(JSON.parse(cached));
        }

        const student = await prisma.student.findFirst({
            where: { userId: session.user.id },
            include: { class: true }
        });

        // Get recent results - only essential fields
        const recentResults = await prisma.quizResult.findMany({
            where: { 
                studentId: student!.id,
                quiz: {
                    settings: {
                        showResult: true
                    }
                }
            },
            select: {
                id: true,
                score: true,
                totalScore: true,
                quizId: true,
                quiz: {
                    select: {
                        title: true,
                        courses: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: { submittedAt: 'desc' },
            take: 5
        });

        // Get upcoming quizzes - only essential fields
        const upcomingQuizzes = await prisma.quiz.findMany({
            where: {
                courses: {
                    some: { classId: student!.classId }
                },
                startTime: { gt: now }
            },
            orderBy: { startTime: 'asc' },
            take: 5,
            select: {
                id: true,
                title: true,
                startTime: true,
                courses: {
                    select: { name: true }
                }
            }
        });

        // Get live quizzes - only essential fields
        const liveQuizzes = await prisma.quiz.findMany({
            where: {
                courses: {
                    some: { classId: student!.classId }
                },
                startTime: { lte: now },
                endTime: { gte: now }
            },
            orderBy: { startTime: 'asc' },
            select: {
                id: true,
                title: true,
                endTime: true,
                courses: {
                    select: { name: true }
                }
            }
        });

        // Optimize performance calculation
        const performanceStats = await prisma.quizResult.aggregate({
            where: {
                studentId: student!.id,
                quiz: {
                    settings: {
                        showResult: true
                    },
                    endTime: { lt: now }
                }
            },
            _avg: {
                score: true
            },
            _count: {
                _all: true
            }
        });

        const totalQuizzes = await prisma.quiz.count({
            where: {
                courses: {
                    some: { classId: student!.classId }
                },
                endTime: { lt: now },
                settings: {
                    showResult: true
                }
            }
        });

        const performanceData = {
            averageScore: performanceStats._avg.score || 0,
            totalQuizzes,
            completedQuizzes: performanceStats._count._all,
            missedQuizzes: totalQuizzes - performanceStats._count._all,
        };

        // Replace the scoreHistory section with this:
        const allCompletedQuizzes = await prisma.quiz.findMany({
            where: {
                courses: { some: { classId: student!.classId } },
                endTime: { lt: now },
                settings: { showResult: true }
            },
            select: {
                id: true,
                endTime: true,
                results: {
                    where: { studentId: student!.id },
                    select: { score: true, totalScore: true }
                }
            },
            orderBy: {
                endTime: 'asc'
            }
        });

        const formattedScoreHistory = allCompletedQuizzes.map((quiz) => {
            if (quiz.results.length === 0) {
                return {
                    date: quiz.endTime,
                    missed: true,
                    normalizedScore: 0,
                    score: 0,
                    totalScore: 0
                };
            }
            const result = quiz.results[0];
            return {
                date: quiz.endTime,
                missed: false,
                score: result.score,
                totalScore: result.totalScore,
                normalizedScore: (result.score / result.totalScore) * 100
            };
        });

        performanceData.scoreHistory = formattedScoreHistory;

        const dashboardData = {
            recentResults,
            upcomingQuizzes,
            liveQuizzes,
            performanceData
        };

        await redis.setex(cacheKey, 300, JSON.stringify(dashboardData)); // Cache for 5 minutes

        return NextResponse.json(dashboardData);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
