import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prismadb';
import { auth } from '@/lib/auth/auth';
import { deleteFile, listFiles, createFolder, moveFile, downloadFile, downloadFolder } from '@/lib/db/minio';

async function getCourseId(request: NextRequest) {
    // First try URL params for GET requests
    const searchParams = request.nextUrl.searchParams;
    const urlCourseId = searchParams.get('courseId');
    if (urlCourseId) {
        return urlCourseId;
    }

    // Then try FormData for POST requests
    try {
        const formData = await request.formData();
        const courseId = formData.get('courseId');
        if (courseId && typeof courseId === 'string') {
            return courseId;
        }
    } catch {
        // If FormData fails, try JSON
        const clonedRequest = request.clone();
        try {
            const { courseId } = await clonedRequest.json();
            if (courseId) {
                return courseId;
            }
        } catch (error) {
            console.log('Error parsing request:', error);
            throw new Error('Invalid course ID format');
        }
    }
    throw new Error('Course ID is required');
}

async function getSession() {
    const session = await auth();
    if (!session || session?.user?.role !== 'STUDENT') {
        throw new Error('Unauthorized');
    }
    return session;
}

async function getCourse(courseId: string) {
    const course = await prisma.course.findFirst({
        where: { id: courseId },
        select: { sharePoint: true },
    });
    if (!course?.sharePoint) {
        throw new Error('No sharepoint path configured');
    }
    return course;
}

export async function GET(request: NextRequest) {
    try {
        const courseId = await getCourseId(request);
        await getSession();
        const course = await getCourse(courseId);

        const searchParams = request.nextUrl.searchParams;
        const fileToDownload = searchParams.get('file');

        if (fileToDownload) {
            // ... existing file download code ...
        }

        const files = await listFiles(course.sharePoint);
        const filesWithUrls = files.map(file => ({
            ...file,
            url: `/api/student/sharepoint/course?file=${encodeURIComponent(file.name)}&courseId=${courseId}`,
            previewUrl: file.name.match(/\.(jpg|jpeg|png|gif|pdf)$/i)
                ? `${process.env.NEXT_PUBLIC_MINIO_URL}/${course.sharePoint}/${encodeURIComponent(file.name)}`
                : null
        }));

        return NextResponse.json({ files: filesWithUrls });
    } catch (error) {
        console.log('Error in GET handler:', error);
        return NextResponse.json(
            { files: [], error: error instanceof Error ? error.message : 'Failed to list files' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const courseId = await getCourseId(request);
        await getSession();
        const course = await getCourse(courseId);

        const formData = await request.formData();
        const folderPath = formData.get('folderPath');
        const fileName = formData.get('fileName');

        if (folderPath && typeof folderPath === 'string') {
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

        if (fileName && typeof fileName === 'string') {
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
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Operation failed' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const courseId = await getCourseId(request);
        await getSession();
        const course = await getCourse(courseId);

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

export async function PATCH(request: NextRequest) {
    try {
        const courseId = await getCourseId(request);
        await getSession();
        const course = await getCourse(courseId);

        const { action, folderName, oldPath, newPath } = await request.json();

        if (action === 'createFolder' && folderName) {
            await createFolder(folderName, course.sharePoint);
            return NextResponse.json({ success: true });
        } else if (action === 'moveFile' && oldPath && newPath) {
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
