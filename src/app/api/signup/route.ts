
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prismadb";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, name } = body;

        if (!email || !password || !name) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Email already exists" },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                role: 'STUDENT'
            }
        });

        return NextResponse.json({ user });
    } catch (error) {
        return NextResponse.json(
            { error: "Something went wrong", message: error },
            { status: 500 }
        );
    }
}