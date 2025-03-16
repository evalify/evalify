import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/admin/staff:
 *   get:
 *     summary: Get staff members with optional search filter
 *     description: Retrieves a list of staff members with their associated user details and active courses
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter staff by user name
 *     responses:
 *       200:
 *         description: List of staff members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: 
 *                     type: string
 *                   user:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phoneNo:
 *                         type: string
 *                   courses:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         code:
 *                           type: string
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
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';

        const staff = await prisma.staff.findMany({
            where: {
                user: {
                    name: {
                        contains: search,
                        mode: 'insensitive'
                    }
                }
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        phoneNo: true
                    }
                },
                courses: {
                    where: {
                        isactive: true
                    },
                    select: {
                        name: true,
                        code: true
                    }
                }
            }
        });
        return NextResponse.json(staff);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
    }
}