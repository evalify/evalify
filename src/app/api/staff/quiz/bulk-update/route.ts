import { NextRequest, NextResponse } from 'next/server';


import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prismadb';


export async function PUT(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { quizIds, courseIds } = await req.json();

        if (!Array.isArray(quizIds) || !Array.isArray(courseIds)) {
            return NextResponse.json(
                { error: 'Invalid request format' },
                { status: 400 }
            );
        }

        // Update each quiz with the new course IDs
        await Promise.all(
            quizIds.map(async (quizId) => {
                await prisma.quiz.update({
                    where: { id: quizId },
                    data: {
                        courses: {
                            set: courseIds.map(id => ({ id }))
                        }
                    }
                });
            })
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Bulk update error:', error);
        return NextResponse.json(
            { error: 'Failed to update quizzes' },
            { status: 500 }
        );
    }
}
