/**
 * @swagger
 * /api/admin/students/reset-password:
 *   post:
 *     summary: Reset passwords for multiple students
 *     description: Resets student passwords to their roll numbers. Only accessible by admin users.
 *     tags:
 *       - Admin
 *       - Students
 *     security:
 *       - session: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of student IDs whose passwords need to be reset
 *     responses:
 *       200:
 *         description: Passwords reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized - User is not an admin
 *       500:
 *         description: Server error while resetting passwords
 */
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth/auth";

export async function POST(req: Request) {
    const session = await auth();

    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studentIds } = await req.json();

    try {
        // Get users with their roll numbers
        const users = await prisma.user.findMany({
            where: {
                id: {
                    in: studentIds
                }
            },
            select: {
                id: true,
                rollNo: true
            }
        });

        // Update passwords for each user
        for (const user of users) {
            if (!user.rollNo) continue;

            const hashedPassword = await hash(user.rollNo, 10);
            await prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword }
            });
        }

        return NextResponse.json({ message: "Passwords reset successfully" });
    } catch (error) {
        console.log('Error resetting passwords:', error);
        return NextResponse.json(
            { error: "Failed to reset passwords" },
            { status: 500 }
        );
    }
}
