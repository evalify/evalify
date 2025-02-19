import minioClient, { sanitizeBucketName } from "@/lib/db/minio";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";


// GET all classes
export async function GET() {
    try {
        const classes = await prisma.class.findMany({
            select: {
                id: true,
                name: true,
                department: true,
                semester: true,
                batch: true,
            }
        });

        return NextResponse.json(classes);  // Return array directly instead of {classes}
    } catch (error) {
        console.error("Error fetching classes:", error);
        return NextResponse.json(
            { error: "Failed to fetch classes" },
            { status: 500 }
        );
    }
}

// POST to add a class
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const bucketName = sanitizeBucketName(body.name);

        if (!(await minioClient.bucketExists(bucketName))) {
            await minioClient.makeBucket(bucketName);
        }
        const bucketUrl = `${bucketName}`;

        const newClass = await prisma.class.create({
            data: {
                name: body.name,
                department: body.department,
                semester: body.semester,
                batch: body.batch,
                sharePoint: bucketUrl,
            },
        });

        return NextResponse.json(newClass, { status: 201 });
    } catch (error) {
        console.log('Error creating class:', error);
        return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
    }
}

// PUT to update a class
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const updatedClass = await prisma.class.update({
            where: { id: body.id },
            data: {
                name: body.name,
                department: body.department,
                semester: body.semester,
                batch: body.batch,
            },
        });
        return NextResponse.json(updatedClass);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update class' }, { status: 500 });
    }
}

// DELETE a class
export async function DELETE(req: Request) {
    try {
        const url = new URL(req.url);
        const id = url.searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }
        await prisma.class.delete({
            where: { id },
        });
        return NextResponse.json({ message: 'Class deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 });
    }
}
