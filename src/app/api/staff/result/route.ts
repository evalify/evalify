import { auth } from "@/lib/auth/auth";
import clientPromise from "@/lib/db/mongo";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";
import { redis, CACHE_KEYS, clearQuizCache } from "@/lib/db/redis";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.role || session?.user?.role !== 'STAFF') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const quizid = searchParams.get('quizid');

        // Try to get from cache first
        const cached = await redis.get(CACHE_KEYS.quizResults(quizid));
        if (cached) {
            return NextResponse.json(JSON.parse(cached));
        }

        if (!quizid) {
            return NextResponse.json({ error: "QuizID not found" }, { status: 404 });
        }

        const quiz = await prisma.quiz.findUnique({
            where: {
                id: quizid
            },
            include: {
                QuizReport: true // Add this to include the quiz report
            }
        });

        const questions = await (await clientPromise).db().collection('NEW_QUESTIONS').find({ quizId: quizid }).toArray();


        const quizResults = await prisma.quizResult.findMany({
            where: {
                quizId: quizid
            },
            include: {
                student: {
                    select: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                                id: true,
                                rollNo: true
                            }
                        }
                    }
                }
            }
        })

        const response = { quiz, quizResults, questions };

        // Cache the response
        await redis.setex(
            CACHE_KEYS.quizResults(quizid),
            3600, // 1 hour
            JSON.stringify(response)
        );

        return NextResponse.json(response);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.role || session?.user?.role !== 'STAFF') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { quizId } = body;

        if (!quizId) {
            return NextResponse.json({ error: "QuizID not found" }, { status: 404 });
        }

        const quizResults = await prisma.quizResult.findMany({
            where: { quizId }
        });

        const questions = await (await clientPromise).db().collection('NEW_QUESTIONS').find({ quizId }).toArray();

        // Evaluate each result
        const evaluatedResults = await Promise.all(quizResults.map(async (result) => {
            const responses = result.responses as Record<string, string[]> || {};
            const questionMarks: Record<string, number> = {};

            questions.forEach(question => {
                // Safely handle missing responses
                const questionId = question._id.toString();
                const studentAnswer = responses[questionId] || [];

                // Ensure we're working with arrays
                const studentAnswerArray = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
                const correctAnswerArray = Array.isArray(question.answer) ? question.answer : [question.answer];

                // Handle empty or invalid answers
                if (!studentAnswerArray.length || studentAnswerArray.some(ans => !ans)) {
                    questionMarks[questionId] = 0;
                    return;
                }

                const sortedStudentAnswer = [...studentAnswerArray].sort();
                const sortedCorrectAnswer = [...correctAnswerArray].sort();

                const isCorrect = JSON.stringify(sortedStudentAnswer) === JSON.stringify(sortedCorrectAnswer);
                const marks = isCorrect ? question.marks : 0;
                questionMarks[questionId] = marks;
            });

            const maxMark = questions.reduce((sum, q) => sum + q.marks, 0);
            // Calculate total score from questionMarks
            const totalScore = Object.values(questionMarks).reduce((sum, mark) => sum + (Number(mark) || 0), 0);

            // Update the result in database with question-wise marks
            return prisma.quizResult.update({
                where: { id: result.id },
                data: {
                    totalScore: maxMark,
                    responses,
                    questionMarks,
                    score: totalScore
                }
            });
        }));

        // Calculate stats
        const scores = evaluatedResults.map(r => r.score);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        const totalScore = scores.reduce((a, b) => a + b, 0);

        // First try to find existing report
        const existingReport = await prisma.quizReport.findUnique({
            where: {
                quizId: quizId
            }
        });

        // Calculate question statistics with marks distribution
        const questionStats = questions.map(question => {
            const questionId = question._id.toString();
            let correct = 0;
            let incorrect = 0;
            let totalMarksObtained = 0;

            quizResults.forEach(result => {
                const questionMarks = (result.questionMarks as Record<string, number>) || {};
                if (questionMarks[questionId] === question.marks) {
                    correct++;
                } else {
                    incorrect++;
                }
                totalMarksObtained += questionMarks[questionId] || 0;
            });

            return {
                questionId,
                questionText: question.question,
                correct,
                incorrect,
                totalAttempts: correct + incorrect,
                avgMarks: totalMarksObtained / quizResults.length,
                maxMarks: question.marks
            };
        });

        // Calculate mark distribution
        const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
        const markDistribution = {
            excellent: 0,  // 80-100%
            good: 0,      // 60-79%
            average: 0,   // 40-59%
            poor: 0       // 0-39%
        };

        scores.forEach(score => {
            const percentage = (score / totalMarks) * 100;
            if (percentage >= 80) markDistribution.excellent++;
            else if (percentage >= 60) markDistribution.good++;
            else if (percentage >= 40) markDistribution.average++;
            else markDistribution.poor++;
        });

        const report = await prisma.quizReport.upsert({
            where: { quizId },
            update: {
                avgScore,
                maxScore,
                minScore,
                totalScore,
                totalStudents: scores.length,
                questionStats,
                markDistribution
            },
            create: {
                quizId,
                avgScore,
                maxScore,
                minScore,
                totalScore,
                totalStudents: scores.length,
                questionStats,
                markDistribution
            }
        });

        await clearQuizCache(quizId);

        return NextResponse.json({
            success: true,
            evaluatedResults,
            report
        });

    } catch (error: any) {
        console.log('Evaluation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}