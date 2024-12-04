import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prismadb';
import { auth } from '@/lib/auth/auth';
import { 
    uploadFile, 
    deleteFile, 
    listFiles, 
    createFolder, 
    moveFile, 
    downloadFolder, 
    downloadFile, 
    sanitizeFolderName
} from '@/lib/db/minio';

// Helper function to validate staff session
async function validateStaffSession() {
    const session = await auth();
    if (!session || session?.user?.role !== 'STAFF') {
        throw new Error('Unauthorized');
    }
    return session;
}

// Update helper function to read courseId from body
async function getCourseSharePoint(request: Request) {
    const body = await request.json();
    const courseId = body.courseId;
    
    if (!courseId) throw new Error('Course ID is required');

    const course = await prisma.course.findFirst({
        where: { id: courseId },
        select: { sharePoint: true },
    });

    if (!course?.sharePoint) {
        throw new Error('No sharepoint path configured');
    }
    return course.sharePoint;
}

export async function PUT(request: NextRequest) {
    try {
        await validateStaffSession();
        const { sharePointUrl, courseId } = await request.json();
        
        const course = await prisma.course.update({
            where: { id: courseId },
            data: { sharePoint: sharePointUrl },
        });

        return NextResponse.json({ course });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update' }, 
            { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        await validateStaffSession();
        
        const { searchParams } = new URL(request.url);
        const fileToDownload = searchParams.get('file');
        const courseId = searchParams.get('courseId');

        if (!courseId) throw new Error('Course ID is required');

        const course = await prisma.course.findFirst({
            where: { id: courseId },
            select: { sharePoint: true },
        });

        if (!course?.sharePoint) throw new Error('No sharepoint path configured');

        if (fileToDownload) {
            const fileStream = await downloadFile(fileToDownload, course.sharePoint);
            const buffer = await streamToBuffer(fileStream);
            
            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="${fileToDownload.split('/').pop()}"`,
                },
            });
        }

        const files = await listFiles(course.sharePoint);
        const filesWithUrls = files.map(file => ({
            ...file,
            url: `/api/staff/sharepoint/course?courseId=${courseId}&file=${encodeURIComponent(file.name)}`,
            previewUrl: file.name.match(/\.(jpg|jpeg|png|gif|pdf)$/i)
                ? `${process.env.NEXT_PUBLIC_MINIO_URL}/${course.sharePoint}/${encodeURIComponent(file.name)}`
                : null
        }));

        return NextResponse.json({ files: filesWithUrls });
    } catch (error) {
        return NextResponse.json(
            { files: [], error: error instanceof Error ? error.message : 'Failed to list files' },
            { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        await validateStaffSession();
        const formData = await request.formData();
        const courseId = formData.get('courseId') as string;
        const file = formData.get('file') as File;
        const folderPath = formData.get('folderPath') as string;

        if (!courseId) throw new Error('Course ID is required');

        const course = await prisma.course.findFirst({
            where: { id: courseId },
            select: { sharePoint: true },
        });

        if (!course?.sharePoint) throw new Error('No sharepoint path configured');

        if (folderPath) {
            const zipStream = await downloadFolder(folderPath, course.sharePoint);
            const buffer = await streamToBuffer(zipStream);
            
            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': 'application/zip',
                    'Content-Disposition': `attachment; filename="${folderPath.split('/').pop()}.zip"`,
                },
            });
        }

        if (!file) throw new Error('No file provided');

        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadFile(buffer, file.name, file.type, course.sharePoint);

        return NextResponse.json({ url });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to upload file' },
            { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        await validateStaffSession();
        const { fileName, courseId } = await request.json();
        
        if (!courseId) throw new Error('Course ID is required');

        const course = await prisma.course.findFirst({
            where: { id: courseId },
            select: { sharePoint: true },
        });

        if (!course?.sharePoint) throw new Error('No sharepoint path configured');
        
        // Handle both files and folders
        if (fileName.endsWith('/')) {
            // It's a folder - remove trailing slash for MinIO
            await deleteFile(fileName.slice(0, -1), course.sharePoint);
        } else {
            await deleteFile(fileName, course.sharePoint);
        }
        
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete' },
            { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        await validateStaffSession();
        const { action, folderName, oldPath, newPath, courseId } = await request.json();
        
        if (!courseId) throw new Error('Course ID is required');

        const course = await prisma.course.findFirst({
            where: { id: courseId },
            select: { sharePoint: true },
        });

        if (!course?.sharePoint) throw new Error('No sharepoint path configured');

        switch (action) {
            case 'createFolder': {
                // Sanitize and validate folder name
                const sanitizedName = sanitizeFolderName(folderName);
                if (!sanitizedName) {
                    throw new Error('Invalid folder name');
                }
                await createFolder(sanitizedName, course.sharePoint);
                break;
            }
            case 'moveFile': {
                await moveFile(oldPath, newPath, course.sharePoint);
                break;
            }
            default:
                throw new Error('Invalid action');
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Operation failed' },
            { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

// Helper function to convert stream to buffer
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}
