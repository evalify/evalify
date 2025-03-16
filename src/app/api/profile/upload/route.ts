import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, deleteFile } from '@/lib/db/minio';
import { prisma } from '@/lib/db/prismadb';

/**
 * @swagger
 * /api/profile/upload:
 *   post:
 *     summary: Upload user profile picture
 *     description: Handles profile picture upload, deletes old picture if exists, and updates user profile
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - email
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file to upload
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *     responses:
 *       200:
 *         description: Successfully uploaded profile picture
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: URL of the uploaded image
 *       400:
 *         description: Missing file or email
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error during upload
 */
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