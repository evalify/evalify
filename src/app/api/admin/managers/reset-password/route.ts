import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";

/**
 * @swagger
 * /api/admin/managers/reset-password:
 *   post:
 *     summary: Reset manager's password
 *     description: Resets a manager's password to their default password (rollNo@123)
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Server error while resetting password
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
