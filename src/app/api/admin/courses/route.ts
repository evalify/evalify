import minioClient, { sanitizeBucketName,uploadFile } from "@/lib/db/minio";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const courses = await prisma.course.findMany({
            include: {
                class: true,
                staff: {
                    include: {
                        user: true
                    }
                }
            }
        });
        return NextResponse.json(courses);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const classSharepoint = await prisma.class.findFirst({
            where: {
                id: body.classId
            },
            select: {
                sharePoint: true,
                name: true
            }
        })
        if (!classSharepoint) {
            return NextResponse.json({ error: "Class not found" }, { status: 404 });
        }

        const bucketName = sanitizeBucketName(`${classSharepoint.sharePoint}-${body.name}`);

        if (!(await minioClient.bucketExists(bucketName))) {
            await minioClient.makeBucket(bucketName);
        }

        const course = await prisma.course.create({
            data: {
                name: body.name,
                code: body.code,
                classId: body.classId,
                staffId: body.staffId || null,
                isactive: true,
                sharePoint: bucketName
            }
        });
        return NextResponse.json(course);
    } catch (error) {
        return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const course = await prisma.course.update({
            where: { id: body.id },
            data: {
                name: body.name,
                code: body.code,
                classId: body.classId,
                staffId: body.staffId || null,
                isactive: body.isactive,
            }
        });
        return NextResponse.json(course);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) throw new Error('No ID provided');

        await prisma.course.delete({
            where: { id }
        });
        return NextResponse.json({ message: "Course deleted successfully" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
    }
}
