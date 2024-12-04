import { NextResponse } from "next/server";
import { languages } from "@/lib/utils";



export async function POST(request: Request) {
    const JUDGE = `${process.env.JUDGE_API}`;

    const { source_code, language } = await request.json();

    const message = {
        source_code: source_code,
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