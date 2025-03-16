import minioClient, { sanitizeBucketName } from "@/lib/db/minio";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/admin/classes:
 *   get:
 *     summary: Retrieve all classes
 *     description: Returns a list of all classes with their basic information
 *     responses:
 *       200:
 *         description: List of classes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   name: { type: string }
 *                   department: { type: string }
 *                   semester: { type: integer }
 *                   batch: { type: string }
 *       500:
 *         description: Server error while fetching classes
 */
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

        return NextResponse.json(classes);

    } catch (error) {
        console.error("Error fetching classes:", error);
        return NextResponse.json(
            { error: "Failed to fetch classes" },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/admin/classes:
 *   post:
 *     summary: Create a new class
 *     description: Creates a new class and its associated storage bucket
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - department
 *               - semester
 *               - batch
 *             properties:
 *               name: { type: string }
 *               department: { type: string }
 *               semester: { type: integer }
 *               batch: { type: string }
 *     responses:
 *       201:
 *         description: Class created successfully
 *       500:
 *         description: Server error while creating class
 */
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

/**
 * @swagger
 * /api/admin/classes:
 *   put:
 *     summary: Update an existing class
 *     description: Updates the details of an existing class
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id: { type: string }
 *               name: { type: string }
 *               department: { type: string }
 *               semester: { type: integer }
 *               batch: { type: string }
 *     responses:
 *       200:
 *         description: Class updated successfully
 *       500:
 *         description: Server error while updating class
 */
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

/**
 * @swagger
 * /api/admin/classes:
 *   delete:
 *     summary: Delete a class
 *     description: Deletes a class by its ID
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the class to delete
 *     responses:
 *       200:
 *         description: Class deleted successfully
 *       400:
 *         description: ID parameter is missing
 *       500:
 *         description: Server error while deleting class
 */
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
