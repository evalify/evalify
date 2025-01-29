import { auth } from "@/lib/auth/auth";
import { redis } from "@/lib/db/redis";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const session = await auth();
        const id = session?.user?.id;

        if (!session?.user?.email || session.user.role !== "STUDENT" || !id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { quizId, responses } = await req.json();

        if (!quizId || !responses) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        // Store in Redis with 10 minute expiration
        await redis.set(
            `response:${quizId}:${id}`,
            JSON.stringify(responses),
            'EX',
            6000 // 10 minutes
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error updating response:', error);
        return NextResponse.json({ error: "Failed to update response" }, { status: 500 });
    }
}
