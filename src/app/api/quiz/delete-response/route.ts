import { auth } from "@/lib/auth/auth";
import { deleteQuizSubmission } from "@/lib/db/minio";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/quiz/delete-response:
 *   post:
 *     summary: Delete a quiz submission
 *     description: Deletes a student's submission for a specific question in a quiz
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
 *               - questionId
 *             properties:
 *               quizId: 
 *                 type: string
 *                 description: ID of the quiz
 *               questionId:
 *                 type: string
 *                 description: ID of the question
 *     responses:
 *       200:
 *         description: Submission deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Bad request - Missing required fields or invalid JSON
 *       401:
 *         description: Unauthorized - User must be a student with valid session
 *       500:
 *         description: Internal server error
 */
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

        const { quizId, questionId } = body;
        
        if (!quizId || !questionId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const rollNo = session.user.rollNo || session.user.id;
        await deleteQuizSubmission(quizId, questionId, rollNo);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in delete route:', error);
        return NextResponse.json({ 
            error: "Failed to delete file",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
