import { NextResponse } from "next/server";
import { languages } from "@/lib/utils";

/**
 * @swagger
 * /api/code:
 *   post:
 *     summary: Submit code for execution
 *     description: Submits source code in a specified programming language for execution
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - source_code
 *               - language
 *             properties:
 *               source_code:
 *                 type: string
 *                 description: The source code to be executed
 *               language:
 *                 type: string
 *                 description: The programming language identifier
 *     responses:
 *       200:
 *         description: Successful execution
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stdout:
 *                   type: string
 *                   description: Standard output from the code execution
 *                 stderr:
 *                   type: string
 *                   description: Standard error output
 *                 status:
 *                   type: object
 *                   description: Execution status details
 */
export async function POST(request: Request) {
    const JUDGE = `${process.env.JUDGE_API}`;

    const { source_code, language } = await request.json();

    const message = {
        source_code: (language !== "octave") ? source_code : `__temp = 1;\n\n ${source_code}`,
        language_id: languages.find((lang) => lang.id == language)?.language_id,
    }

    const res = await fetch(
        `${JUDGE}/submissions?base64_encoded=false&wait=true`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Authorization: `Bearer ${process.env.JUDGE_API_KEY}`,
            },
            "body": JSON.stringify(message)
        }
    )
    const data = await res.json();
    return NextResponse.json({ ...data });
}