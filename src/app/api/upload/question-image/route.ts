import { NextRequest, NextResponse } from 'next/server';
import { uploadQuestionImage } from '@/lib/db/minio';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('image') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
        }

        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json({
                error: 'Image size must be less than 5MB'
            }, { status: 400 });
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const uniqueId = nanoid();
        const fileName = `${uniqueId}.${fileExt}`;

        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadQuestionImage(buffer, fileName, file.type);

        return NextResponse.json({ url });
    } catch (error) {
        console.log('Error uploading image:', error);
        return NextResponse.json(
            { error: 'Failed to upload image' },
            { status: 500 }
        );
    }
}
