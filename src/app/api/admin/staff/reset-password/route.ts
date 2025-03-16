import { NextRequest, NextResponse } from "next/server";

import { hash } from "bcryptjs";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";

/**
 * @swagger
 * /api/admin/staff/reset-password:
 *   post:
 *     summary: Reset staff member's password
 *     description: Resets a staff member's password to their default password format (rollNo@123)
 *     tags:
 *       - Admin
 *       - Staff Management
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Staff member's email address
 *             required:
 *               - email
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized - Admin access required
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { email } = await req.json();
        const rollNo = email.split("@")[0]

        if (!email || !rollNo) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const newPassword = `${rollNo}@123`;
        const hashedPassword = await hash(newPassword, 10);

        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword },
        });

        return NextResponse.json({ message: "Password reset successful" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
    }
}
