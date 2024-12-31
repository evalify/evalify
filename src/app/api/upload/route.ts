import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/db/minio';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `question-images/${Date.now()}-${file.name}`;
    
    const url = await uploadFile(buffer, fileName, file.type, 'evalify');
    
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' }, 
      { status: 500 }
    );
  }
}
