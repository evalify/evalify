/**
 * @swagger
 * /api/quiz/update-response:
 *   post:
 *     summary: Update quiz responses in cache
 *     description: Temporarily stores student's quiz responses in Redis cache
 *     tags:
 *       - Quiz
 *     security:
 *       - session: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quizId
 *               - responses
 *             properties:
 *               quizId:
 *                 type: string
 *                 description: The ID of the quiz being attempted
 *               responses:
 *                 type: object
 *                 description: Object containing question IDs and their responses
 *     responses:
 *       200:
 *         description: Responses updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Invalid request - missing quizId or responses
 *       401:
 *         description: Unauthorized - User must be logged in as a student
 *       500:
 *         description: Server error while updating response
 */
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

        await redis.set(
            `response:${quizId}:${id}`,
            JSON.stringify(responses),
            'EX',
            6000000
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error updating response:', error);
        return NextResponse.json({ 
            error: "Failed to update response",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
