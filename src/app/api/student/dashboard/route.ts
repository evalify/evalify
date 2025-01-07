import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
import { redis, CACHE_KEYS } from "@/lib/db/redis";
import { NextResponse } from "next/server";

export async function GET() {
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

        // Get recent results
        const recentResults = await prisma.quizResult.findMany({
            where: { 
                studentId: student!.id,
                quiz: {
                    settings: {
                        showResult: true
                    }
                }
            },
            include: {
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

        // Get upcoming quizzes
        const now = new Date();
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
                duration: true,
                courses: {
                    select: { name: true }
                }
            }
        });

        // Get live quizzes
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
                startTime: true,
                endTime: true,
                duration: true,
                courses: {
                    select: { name: true }
                }
            }
        });

        // Get all quizzes assigned to student's class that have ended
        const allAssignedQuizzes = await prisma.quiz.findMany({
            where: {
                courses: {
                    some: { classId: student!.classId }
                },
                endTime: { lt: now }
            },
            include: {
                results: {
                    where: { studentId: student!.id }
                },
                settings: true
            }
        });

        // Calculate performance metrics including missed quizzes
        const scoreHistory = allAssignedQuizzes
            .filter(quiz => quiz.settings.showResult) // Only include quizzes that allow showing results
            .map(quiz => ({
                date: quiz.endTime,
                score: quiz.results[0]?.score ?? 0,
                totalScore: quiz.results[0]?.totalScore ?? 100,
                normalizedScore: quiz.results[0] ? (quiz.results[0].score / quiz.results[0].totalScore) * 100 : 0,
                missed: quiz.results.length === 0
            }));

        const visibleCompletedQuizzes = allAssignedQuizzes.filter(
            quiz => quiz.settings.showResult && quiz.results.length > 0
        ).length;

        const totalVisibleQuizzes = allAssignedQuizzes.filter(
            quiz => quiz.settings.showResult
        ).length;

        const performanceData = {
            averageScore: scoreHistory.length > 0 
                ? (scoreHistory.reduce((acc, curr) => acc + curr.normalizedScore, 0) / scoreHistory.length)
                : 0,
            totalQuizzes: totalVisibleQuizzes,
            completedQuizzes: visibleCompletedQuizzes,
            missedQuizzes: totalVisibleQuizzes - visibleCompletedQuizzes,
            scoreHistory
        };

        const dashboardData = {
            recentResults,
            upcomingQuizzes,
            liveQuizzes,
            performanceData
        };

        await redis.setex(cacheKey, 300, JSON.stringify(dashboardData)); // Cache for 5 minutes

        return NextResponse.json(dashboardData);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
