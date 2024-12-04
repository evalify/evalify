import { auth } from "@/lib/auth/auth";
import clientPromise from "@/lib/db/mongo";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";


export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session.user?.email?.startsWith("cb.ai.u4aid23003")){
            return NextResponse.json({ status: 401, message: "Unauthorized" });
        }

        const queryParams = new URLSearchParams(req.url.split('?')[1]);
        const quizId = await queryParams.get('quizId');

        if (!quizId) {
            return NextResponse.json({ error: "QuizID not found" }, { status: 404 });
        }

        // // check if the student completed the quiz
        // const studentQuiz = await prisma.quizResult.findFirst({
        //     where: {
        //         quizId: quizId
        //     }
        // });

        // if (studentQuiz) {
        //     return NextResponse.json({ error: "Quiz already completed" }, { status: 400 });
        // }

        const quiz = await prisma.quiz.findUnique({
            where: {
                id: quizId
            }
        });

        if (!quiz) {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }


        // get questions from MONGODB
        const questions = await (await clientPromise).db().collection('NEW_QUESTIONS').find({ quizId: quizId }).toArray();

        const safeQuestion = questions.map((question) => {
            return {
                id: question._id,
                question: question.question,
                options: question.options,
                // answer: question.answer,
                marks: question.marks,
                type: (question.answer.length > 1) ? 'MMCQ' : 'MCQ',
                quizId: question.quizId
            }
        })

        return NextResponse.json({ quiz, questions: safeQuestion });

    } catch (error) {
        console.log('Error fetching quiz:', error);
        return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 });

    }
}