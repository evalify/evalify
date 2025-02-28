import { NextRequest, NextResponse } from 'next/server';

const TARGET_API = `${process.env.EVALUATION_API}`;


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
