import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prismadb'



export async function GET(
    request: Request,
    { params }: { params: { quizId: string } }
) {
    try {
        const session = await auth();
        const { quizId } = await params;
        if (!session || session.user.role !== 'STAFF') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let settings = await prisma.evaluationSettings.findUnique({
            where: { quizId: quizId }
        })

        if (!settings) {
            settings = await prisma.evaluationSettings.create({
                data: {
                    quiz: { connect: { id: quizId } },
                    negativeMark: false,
                    mcqPartialMark: true,
                    codePartialMark: false
                }
            })
        }

        return NextResponse.json(settings)

    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { quizId: string } }
) {
    try {
        const session = await auth();
        const { quizId } = await params;

        if (!session || session.user.role !== 'STAFF') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const settings = await prisma.evaluationSettings.upsert({
            where: { quizId: quizId },
            create: {
                quiz: { connect: { id: quizId } },
                negativeMark: body.negativeMark ?? false,
                mcqPartialMark: body.mcqPartialMark ?? true,
                codePartialMark: body.codePartialMark ?? false,
                evaluatorModel: body.evaluatorModel
            },
            update: {
                negativeMark: body.negativeMark,
                mcqPartialMark: body.mcqPartialMark,
                codePartialMark: body.codePartialMark,
                evaluatorModel: body.evaluatorModel
            }
        })

        return NextResponse.json(settings)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }
}
