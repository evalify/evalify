import { auth } from "@/lib/auth/auth";
import clientPromise from "@/lib/db/mongo";
import { prisma } from "@/lib/db/prismadb";
import { redis } from "@/lib/db/redis";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const session = await auth();
        const id = session?.user?.id;

        if (session?.user?.role !== 'STUDENT' || !id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const queryParams = new URLSearchParams(req.url.split('?')[1]);
        const quizId = await queryParams.get('quizId');

        if (!quizId) {
            return NextResponse.json({ error: "QuizID not found" }, { status: 404 });
        }

        // Parallel fetch of quiz data, student attempt, and cached data
        const [quiz, studentQuiz, cachedQuestions, userShuffledQuestions] = await Promise.all([
            prisma.quiz.findUnique({
                where: { id: quizId },
                select: {
                    title: true,
                    settings: true,
                    duration: true,
                    startTime: true,
                    endTime: true
                }
            }),
            prisma.quizResult.findFirst({
                where: {
                    quizId: quizId,
                    student: { id: id }
                }
            }),
            redis.get(`QUIZ_${quizId}`),
            redis.get(`QUIZ_${quizId}_${id}_questions`)
        ]);

        if (studentQuiz?.isSubmitted) {
            return NextResponse.json({ message: "Quiz already completed" }, { status: 400 });
        }

        if (!quiz) {
            return NextResponse.json({ message: "Quiz not found" }, { status: 404 });
        }

        const currTime = new Date();
        if (!(currTime >= quiz.startTime && currTime <= quiz.endTime)) {
            return NextResponse.json({ message: "Quiz is not available at this time" }, { status: 403 });
        }

        // Create or get existing quiz attempt with transaction
        const quizAttempt = await prisma.$transaction(async (tx) => {
            const existing = await tx.quizResult.findUnique({
                where: {
                    studentId_quizId: {
                        studentId: id,
                        quizId: quizId
                    }
                }
            });

            if (!existing) {
                return await tx.quizResult.create({
                    data: {
                        studentId: id,
                        quizId: quizId,
                        score: 0,
                        totalScore: 0,
                        startTime: new Date(),
                        isSubmitted: false,
                        isEvaluated: 'UNEVALUATED'
                    }
                });
            }

            if (existing.isSubmitted) {
                throw new Error("Quiz already submitted");
            }
            return existing;
        });

        const restoredResponses = await redis.get(
            `response:${quizId}:${id}`,
        );

        if (userShuffledQuestions) {
            return NextResponse.json({
                quiz,
                responses: restoredResponses,
                questions: JSON.parse(userShuffledQuestions),
                quizAttempt: {
                    startTime: quizAttempt.startTime
                }
            }, { status: 200 });
        }

        // Use cached questions or fetch from MongoDB
        let questions;
        if (cachedQuestions) {
            questions = JSON.parse(cachedQuestions);
        } else {
            const rawQuestions = await (await clientPromise)
                .db()
                .collection('NEW_QUESTIONS')
                .find({ quizId: quizId })
                .toArray();

            questions = rawQuestions.map((question: any) => ({
                id: question._id,
                question: question.question,
                mark: question.mark || question.marks,
                type: Array.isArray(question.answer) && question.answer.length > 1 ? 'MMCQ' : question.type,
                quizId: question.quizId,
                ...(question.options && { options: question.options }),
                ...(question.attachedFile && { attachedFile: question.attachedFile })
            }));

            // Cache the original questions
            await redis.set(
                `QUIZ_${quizId}`, 
                JSON.stringify(questions), 
                'EX', 
                5 * 60 * 60
            );
        }

        // Shuffle if needed and cache user-specific order
        if (quiz.settings?.shuffle) {
            const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);
            await redis.set(
                `QUIZ_${quizId}_${id}_questions`,
                JSON.stringify(shuffledQuestions),
                'EX',
                quiz.duration * 60 * 2// Cache for quiz duration
            );
            questions = shuffledQuestions;
        }

        return NextResponse.json({
            quiz,
            questions,
            responses: restoredResponses,
            quizAttempt: {
                startTime: quizAttempt.startTime
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Error fetching quiz:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 });
    }
}