
import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, deleteFile } from '@/lib/db/minio';
import { prisma } from '@/lib/db/prismadb';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const email = formData.get('email') as string;

        if (!file || !email) {
            return NextResponse.json(
                { error: 'File and email are required' },
                { status: 400 }
            );
        }

        // Get existing user to check for old image
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;

        // Convert File to Buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload new file
        const url = await uploadFile(buffer, fileName, file.type, 'profile-pics');

        // Delete old image if exists
        if (user.image) {
            const oldFileName = user.image.split('/').pop();
            if (oldFileName) {
                await deleteFile(oldFileName, "profile-pics");
            }
        }

        // Update user profile with new image URL
        await prisma.user.update({
            where: { email },
            data: { image: url },
        });

        return NextResponse.json({ url });
    } catch (error) {
        console.log('Error handling image upload:', error);
        return NextResponse.json(
            { error: 'Error uploading image' },
            { status: 500 }
        );
    }
}