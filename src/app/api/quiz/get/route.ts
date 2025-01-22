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

        // check if the student completed the quiz
        const studentQuiz = await prisma.quizResult.findFirst({
            where: {
                quizId: quizId,
                student: {
                    id: id
                }
            }
        });

        if (studentQuiz) {
            return NextResponse.json({ message: "Quiz already completed" }, { status: 400 });
        }

        const quiz = await prisma.quiz.findUnique({
            where: {
                id: quizId
            },
            select:{
                settings: true,
                duration: true,
            }
        });

        if (!quiz) {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }

        const cache = await redis.get(`QUIZ_${quizId}`);

        if (cache) {
            if (quiz.settings?.shuffle){
                const questions = JSON.parse(cache);
                questions.sort(() => Math.random() - 0.5);
                return NextResponse.json({ quiz, questions }, { status: 200 });
            }
            return NextResponse.json({ quiz, questions: JSON.parse(cache) }, { status: 200 });
        }

        const questions = await (await clientPromise).db().collection('NEW_QUESTIONS').find({ quizId: quizId }).toArray();

        const safeQuestion = questions.map((question: any) => {
            const baseFields = {
                id: question._id,
                question: question.question,
                mark: question.mark || question.marks,
                type: question.type,
                quizId: question.quizId
            };

            switch (question.type) {
                case 'DESCRIPTIVE':
                    return {
                        ...baseFields,
                        guidelines: question.guidelines
                    };
                case 'FILL_IN_BLANK':
                    return baseFields;
                case 'TRUE_FALSE':
                    return {
                        ...baseFields,
                        options: question.options
                    };
                case 'MCQ':
                    // Convert MCQ with multiple answers to MMCQ
                    if (Array.isArray(question.answer) && question.answer.length > 1) {
                        return {
                            ...baseFields,
                            type: 'MMCQ',
                            options: question.options
                        };
                    }
                    return {
                        ...baseFields,
                        options: question.options
                    };
                default:
                    return {
                        ...baseFields,
                        options: question.options
                    };
            }
        });

        await redis.set(`QUIZ_${quizId}`, JSON.stringify(safeQuestion), 'EX', 2 * 60 * 60);

        return NextResponse.json({ quiz, questions: safeQuestion }, { status: 200 });

    } catch (error) {
        console.log('Error fetching quiz:', error);
        return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 });

    }
}