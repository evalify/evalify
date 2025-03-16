import { NextRequest, NextResponse } from 'next/server';

const TARGET_API = `${process.env.EVALUATION_API}`;

/**
 * @swagger
 * /api/eval/{path}:
 *   get:
 *     summary: Proxy GET request to evaluation API
 *     description: Forwards GET request to the target evaluation API and returns the response
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         description: Path parameters to forward to the target API
 *       - in: query
 *         name: *
 *         description: Any query parameters to forward to the target API
 *     responses:
 *       200:
 *         description: Successful response from target API
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
export async function GET(req: NextRequest) {
    const targetUrl = new URL(req.nextUrl.pathname, TARGET_API);
    targetUrl.search = req.nextUrl.searchParams.toString();

    const response = await fetch(targetUrl.toString().replace("/api/eval",""), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}

/**
 * @swagger
 * /api/eval/{path}:
 *   post:
 *     summary: Proxy POST request to evaluation API
 *     description: Forwards POST request with JSON body to the target evaluation API
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         description: Path parameters to forward to the target API
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successful response from target API
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
export async function POST(req: NextRequest) {
    const targetUrl = new URL(req.nextUrl.pathname, TARGET_API);
    const body = await req.json();

    const response = await fetch(targetUrl.toString().replace("/api/eval", ""), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}
