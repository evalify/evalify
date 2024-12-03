import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prismadb';
import { auth } from '@/lib/auth/auth';
import { uploadFile, deleteFile, listFiles, createFolder, moveFile, downloadFile, downloadFolder } from '@/lib/db/minio';

export async function GET(
    request: NextRequest,
    { params }: { params: { courseId: string } }
) {
    try {
        const courseId = params.courseId;
        const session = await auth();
        if (!session || session?.user?.role !== 'STUDENT') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const course = await prisma.course.findFirst({
            where: { id: courseId },
            select: { sharePoint: true },
        });

        if (!course?.sharePoint) {
            return NextResponse.json({ files: [], error: 'No sharepoint path configured' }, { status: 400 });
        }

        const searchParams = request.nextUrl.searchParams;
        const fileToDownload = searchParams.get('file');

        // Handle file download request
        if (fileToDownload && course?.sharePoint) {
            const fileStream = await downloadFile(fileToDownload, course.sharePoint);
            const chunks = [];
            for await (const chunk of fileStream) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);

            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="${fileToDownload.split('/').pop()}"`,
                },
            });
        }

        // Regular file listing
        const files = await listFiles(course?.sharePoint || '');
        
        const filesWithUrls = files.map(file => ({
            ...file,
            url: `/api/student/sharepoint/${courseId}?file=${encodeURIComponent(file.name)}`,
            previewUrl: file.name.match(/\.(jpg|jpeg|png|gif|pdf)$/i) 
                ? `${process.env.NEXT_PUBLIC_MINIO_URL}/${course?.sharePoint}/${encodeURIComponent(file.name)}`
                : null
        }));

        return NextResponse.json({ files: filesWithUrls || [] });
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
        if (!session || session?.user?.role !== 'STUDENT') {
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
        const folderPath = formData.get('folderPath') as string;
        const fileName = formData.get('fileName') as string;

        // Handle folder downloads
        if (folderPath) {
            const zipStream = await downloadFolder(folderPath, course.sharePoint);
            const chunks = [];
            for await (const chunk of zipStream) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);

            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': 'application/zip',
                    'Content-Disposition': `attachment; filename="${folderPath.split('/').pop()}.zip"`,
                },
            });
        }

        // Handle file downloads
        if (fileName) {
            const filePath = `${course.sharePoint}/${fileName}`;
            const fileStream = await downloadFile(fileName, course.sharePoint);
            const chunks = [];
            for await (const chunk of fileStream) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);

            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="${fileName.split('/').pop()}"`,
                },
            });
        }

        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { courseId: string } }
) {
    try {
        const courseId = params.courseId;
        const session = await auth();
        if (!session || session?.user?.role !== 'STUDENT') {
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
        if (!session || session?.user?.role !== 'STUDENT') {
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
