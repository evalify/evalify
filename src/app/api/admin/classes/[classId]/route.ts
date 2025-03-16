import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/admin/classes/{classId}:
 *   get:
 *     summary: Get details of a specific class
 *     description: Retrieves detailed information about a class including the student count
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the class
 *     responses:
 *       200:
 *         description: Class details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 _count:
 *                   type: object
 *                   properties:
 *                     students:
 *                       type: number
 *       404:
 *         description: Class not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
export async function GET(
    request: Request,
    { params }: { params: { classId: string } }
) {
    try {
        const param = await params;
        const { classId } = param;
        const classDetails = await prisma.class.findUnique({
            where: { id: classId },
            include: {
                _count: {
                    select: { students: true }
                }
            }
        });

        if (!classDetails) {
            return NextResponse.json({ error: "Class not found" }, { status: 404 });
        }

        return NextResponse.json(classDetails);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch class details" }, { status: 500 });
    }
}