import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/db/minio';
import { sanitizeBucketName } from '@/lib/db/minio';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
        const fileName = `uploads/${timestamp}-${sanitizedName}`;
        const bucketName = sanitizeBucketName('evalify');

        const url = await uploadFile(buffer, fileName, file.type, bucketName);

        return NextResponse.json({ url });
    } catch (error) {
        console.log('Error uploading file:', error);
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        );
    }
}
