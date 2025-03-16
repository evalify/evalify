import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/admin/managers:
 *   get:
 *     summary: Retrieve all managers
 *     description: Fetches all managers with optional search filter by name
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search string to filter managers by name
 *     responses:
 *       200:
 *         description: List of managers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 managers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       user:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                       class:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *       500:
 *         description: Server error while fetching managers
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';

        console.log({ search })
        const managers = await prisma.manager.findMany({
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
                    }
                },
                class: {
                    select: {
                        id: true,  // Include id in the selection
                        name: true,
                    }
                }
            }
        });

        return NextResponse.json({ managers }, { status: 200 }); // Return as an object with managers key
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch managers" }, { status: 500 });
    }
}