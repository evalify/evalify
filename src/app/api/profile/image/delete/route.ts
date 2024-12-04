
import { NextRequest, NextResponse } from 'next/server';
import { deleteFile } from '@/lib/db/minio';
import { prisma } from '@/lib/db/prismadb';

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.image) {
            return NextResponse.json(
                { error: 'User or image not found' },
                { status: 404 }
            );
        }

        const fileName = user.image.split('/').pop();
        if (fileName) {
            await deleteFile(fileName, "profile-pics");
        }

        await prisma.user.update({
            where: { email },
            data: { image: null },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.log('Error deleting image:', error);
        return NextResponse.json(
            { error: 'Error deleting image' },
            { status: 500 }
        );
    }
}