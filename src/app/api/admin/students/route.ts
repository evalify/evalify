/**
 * @swagger
 * /api/admin/students:
 *   get:
 *     summary: Get list of students
 *     description: Retrieves a paginated list of students with optional search functionality
 *     tags:
 *       - Admin
 *       - Students
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering students by name, email or roll number
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: dashboard
 *         schema:
 *           type: boolean
 *         description: If true, returns only total count of students
 *     responses:
 *       200:
 *         description: Successfully retrieved students list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 students:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: 
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       rollNo:
 *                         type: string
 *                       Student:
 *                         type: array
 *                         items:
 *                           type: object
 *                 total:
 *                   type: integer
 *                 pages:
 *                   type: integer
 *       500:
 *         description: Server error while fetching students
 *
 *   put:
 *     summary: Update students' class assignment
 *     description: Updates the class assignment for multiple students
 *     tags:
 *       - Admin
 *       - Students
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentIds
 *               - classId
 *             properties:
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of student IDs to update
 *               classId:
 *                 type: string
 *                 description: ID of the class to assign students to
 *     responses:
 *       200:
 *         description: Students updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error while updating students
 */

import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // For dashboard count
    if (searchParams.get("dashboard") === "true") {
        try {
            const total = await prisma.student.count({
                where: { user: { role: "STUDENT" } }
            });
            return NextResponse.json({ total });
        } catch (error) {
            console.log('Error counting students:', error);
            return NextResponse.json({ total: 0 });
        }
    }

    try {
        const whereClause = search ? {
            user: {
                role: "STUDENT",
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { rollNo: { contains: search, mode: 'insensitive' } }
                ]
            }
        } : {
            user: { role: "STUDENT" }
        };

        const students = await prisma.student.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        rollNo: true,
                    }
                },
                class: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            },
            orderBy: {
                user: {
                    name: 'asc'
                }
            },
            ...(search ? {} : { skip, take: limit })
        });

        const formattedStudents = students
            .filter(student => student.user)
            .map(student => ({
                id: student.user.id,
                name: student.user.name,
                email: student.user.email,
                rollNo: student.user.rollNo || '',
                Student: [{
                    id: student.id,
                    class: student.class
                }]
            }));

        const total = search ? formattedStudents.length : await prisma.student.count({ where: whereClause });

        return NextResponse.json({
            students: formattedStudents,
            total,
            pages: search ? 1 : Math.ceil(total / limit)
        }, { status: 200 });

    } catch (error) {
        console.log('Error in students API:', error);
        return NextResponse.json({
            students: [],
            total: 0,
            pages: 0
        }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { studentIds, classId } = body;

        if (!studentIds || !classId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        await prisma.student.updateMany({
            where: {
                id: {
                    in: studentIds
                }
            },
            data: {
                classId
            }
        });
        return NextResponse.json({ message: "Students updated successfully" });
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to update students" },
            { status: 500 }
        );
    }
}
