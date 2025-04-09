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

        let body;
        try {
            body = await req.json();
        } catch (error) {
            return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
        }

        const { quizId, responses } = body;

        if (!quizId || !responses) {
            return NextResponse.json({ error: "Invalid request: missing quizId or responses" }, { status: 400 });
        }

        // if the response is a empty json
        if (Object.keys(responses).length !== 0) {
            await redis.set(
                `response:${quizId}:${id}`,
                JSON.stringify(responses),
                'EX',
                6000000
            );
            return NextResponse.json({ success: true });
        }
        
        return NextResponse.json({ success: false });

    } catch (error) {
        console.error('Error updating response:', error);
        return NextResponse.json({ 
            error: "Failed to update response",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
