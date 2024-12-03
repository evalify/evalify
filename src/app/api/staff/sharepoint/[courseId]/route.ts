import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prismadb';
import { auth } from '@/lib/auth/auth';
import { uploadFile, deleteFile, listFiles, createFolder, moveFile, downloadFolder } from '@/lib/db/minio';
import { Readable } from 'stream';

export async function PUT(
    request: NextRequest,
    { params }: { params: { courseId: string } }
) {
    try {
        const courseId = params.courseId;
        const session = await auth();
        if (!session || session?.user?.role !== 'STAFF') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { sharePointUrl } = await request.json();
        const course = await prisma.course.update({
            where: { id: courseId },
            data: { sharePoint: sharePointUrl },
        });

        return NextResponse.json({ course });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: { courseId: string } }
) {
    try {
        const courseId = params.courseId;
        const session = await auth();
        if (!session || session?.user?.role !== 'STAFF') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const course = await prisma.course.findFirst({
            where: { id: courseId },
            select: { sharePoint: true },
        });

        if (!course?.sharePoint) {
            return NextResponse.json({ files: [] });
        }

        const files = await listFiles(course.sharePoint);
        
        // Modify files to include preview URLs
        const filesWithUrls = files.map(file => ({
            ...file,
            url: `${process.env.NEXT_PUBLIC_MINIO_URL}/${course.sharePoint}/${file.name}`,
            previewUrl: `${process.env.NEXT_PUBLIC_MINIO_URL}/${course.sharePoint}/${file.name}`
        }));

        return NextResponse.json({ files: filesWithUrls || [] }, { status: 200 });
    } catch (error) {
        console.error('Error in GET:', error);
        return NextResponse.json(
            { files: [], error: error instanceof Error ? error.message : 'Failed to list files' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { courseId: string } }
) {
    try {
        const courseId = params.courseId;
        const session = await auth();
        if (!session || session?.user?.role !== 'STAFF') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const course = await prisma.course.findFirst({
            where: { id: courseId },
            select: { sharePoint: true },
        });

        if (!course?.sharePoint) {
            return NextResponse.json({ error: 'No sharepoint path configured' }, { status: 400 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const folderPath = formData.get('folderPath') as string;

        if (folderPath) {
            const zipStream = await downloadFolder(folderPath, course.sharePoint);
            const chunks = [];
            for await (const chunk of zipStream) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);

            return new Response(buffer, {
                headers: {
                    'Content-Type': 'application/zip',
                    'Content-Disposition': `attachment; filename="${folderPath.split('/').pop()}.zip"`,
                },
            });
        }

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        const url = await uploadFile(buffer, file.name, file.type, course.sharePoint);

        return NextResponse.json({ url });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { courseId: string } }
) {
    try {
        const courseId = params.courseId;
        const session = await auth();
        if (!session || session?.user?.role !== 'STAFF') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const course = await prisma.course.findFirst({
            where: { id: courseId },
            select: { sharePoint: true },
        });

        if (!course?.sharePoint) {
            return NextResponse.json({ error: 'No sharepoint path configured' }, { status: 400 });
        }

        const { fileName } = await request.json();
        await deleteFile(fileName, course.sharePoint);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete file' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { courseId: string } }
) {
    try {
        const courseId = params.courseId;
        const session = await auth();
        if (!session || session?.user?.role !== 'STAFF') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const course = await prisma.course.findFirst({
            where: { id: courseId },
            select: { sharePoint: true },
        });

        if (!course?.sharePoint) {
            return NextResponse.json({ error: 'No sharepoint path configured' }, { status: 400 });
        }

        const { action, folderName, oldPath, newPath } = await request.json();

        if (action === 'createFolder') {
            await createFolder(folderName, course.sharePoint);
            return NextResponse.json({ success: true });
        } else if (action === 'moveFile') {
            await moveFile(oldPath, newPath, course.sharePoint);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Operation failed' },
            { status: 500 }
        );
    }
}
