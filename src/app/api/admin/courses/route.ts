import minioClient, { sanitizeBucketName,uploadFile } from "@/lib/db/minio";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/admin/courses:
 *   get:
 *     summary: Retrieve all courses
 *     description: Fetches all courses with their associated class and staff information
 *     responses:
 *       200:
 *         description: List of courses retrieved successfully
 *       500:
 *         description: Server error while fetching courses
 */
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

/**
 * @swagger
 * /api/admin/courses:
 *   post:
 *     summary: Create a new course
 *     description: Creates a new course and its associated MinIO bucket
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               classId:
 *                 type: string
 *               staffId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Course created successfully
 *       404:
 *         description: Class not found
 *       500:
 *         description: Server error while creating course
 */
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

/**
 * @swagger
 * /api/admin/courses:
 *   put:
 *     summary: Update a course
 *     description: Updates an existing course's details
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               classId:
 *                 type: string
 *               staffId:
 *                 type: string
 *               isactive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Course updated successfully
 *       500:
 *         description: Server error while updating course
 */
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

/**
 * @swagger
 * /api/admin/courses:
 *   delete:
 *     summary: Delete a course
 *     description: Deletes a course by its ID
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID to delete
 *     responses:
 *       200:
 *         description: Course deleted successfully
 *       500:
 *         description: Server error while deleting course
 */
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
