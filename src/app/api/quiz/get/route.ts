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
                    userId: id
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
                settings: true
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
            if (question.type === 'DESCRIPTIVE') {
                return {
                    id: question._id,
                    question: question.question,
                    marks: question.marks,
                    type: 'DESCRIPTIVE',
                    quizId: question.quizId
                }
            }
            return {
                id: question._id,
                question: question.question,
                options: question.options,
                marks: question.marks,
                type: (question.answer.length > 1) ? 'MMCQ' : 'MCQ',
                quizId: question.quizId
            }
        })

        await redis.set(`QUIZ_${quizId}`, JSON.stringify(safeQuestion), 'EX', 2 * 60 * 60);

        return NextResponse.json({ quiz, questions: safeQuestion }, { status: 200 });

    } catch (error) {
        console.log('Error fetching quiz:', error);
        return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 });

    }
}