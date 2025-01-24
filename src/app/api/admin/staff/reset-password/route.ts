import { NextRequest, NextResponse } from "next/server";

import { hash } from "bcryptjs";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";

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
