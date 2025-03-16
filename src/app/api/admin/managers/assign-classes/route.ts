import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/admin/managers/assign-classes:
 *   post:
 *     summary: Assign classes to a manager
 *     description: Assigns multiple classes to a specific manager
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               managerId:
 *                 type: string
 *               classIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Classes assigned successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Manager not found
 *       500:
 *         description: Server error while assigning classes
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { managerId, classIds } = body;

        if (!managerId || !Array.isArray(classIds)) {
            return NextResponse.json(
                { error: "Invalid request data" },
                { status: 400 }
            );
        }

        // First, verify that the manager exists
        const manager = await prisma.manager.findUnique({
            where: { id: managerId }
        });

        if (!manager) {
            return NextResponse.json(
                { error: "Manager not found" },
                { status: 404 }
            );
        }

        // Update the manager's class assignments
        // This will replace all existing assignments with the new ones
        const updatedManager = await prisma.manager.update({
            where: { id: managerId },
            data: {
                class: {
                    set: classIds.map(id => ({ id }))
                }
            },
            include: {
                class: {
                    select: {
                        name: true
                    }
                },
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });

        return NextResponse.json({
            message: "Classes assigned successfully",
            manager: updatedManager
        });
    } catch (error) {
        console.error("Error assigning classes:", error);
        return NextResponse.json(
            { error: "Failed to assign classes" },
            { status: 500 }
        );
    }
}

/**
 * @swagger
 * /api/admin/managers/assign-classes:
 *   get:
 *     summary: Get manager's class assignments
 *     description: Retrieves all classes assigned to a specific manager
 *     parameters:
 *       - in: query
 *         name: managerId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the manager
 *     responses:
 *       200:
 *         description: Successfully retrieved assignments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assignments:
 *                   type: object
 *                   properties:
 *                     class:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *       400:
 *         description: Manager ID is missing
 *       500:
 *         description: Server error while fetching assignments
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const managerId = searchParams.get('managerId');

        if (!managerId) {
            return NextResponse.json(
                { error: "Manager ID is required" },
                { status: 400 }
            );
        }

        const assignments = await prisma.manager.findUnique({
            where: { id: managerId },
            include: {
                class: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        return NextResponse.json({ assignments });
    } catch (error) {
        console.error("Error fetching assignments:", error);
        return NextResponse.json(
            { error: "Failed to fetch assignments" },
            { status: 500 }
        );
    }
}
