import { redis } from "@/lib/db/redis";
import logger from "@/lib/logger/loki";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { logData } = body;

        try {
            await redis.lpush("requestLogs", JSON.stringify(logData));
            await logger.info("Request log", {
                ...logData
            })
                
            return NextResponse.json({ success: true, status: 200 });
        } catch (error) {
            console.error("Failed to log request:", error);
            return NextResponse.json({ success: false, status: 400 }, {
                status: 400,
            });
        }
    } catch (e) {
        console.error("Error logging request:", e);
        return NextResponse.json({ success: false, status: 400 }, {
            status: 400,
        });
    }
}
