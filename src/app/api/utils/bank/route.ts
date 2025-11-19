import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db";
import { banksTable } from "@/db/schema";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
    try {
        const bank = await db.select().from(banksTable);

        if (bank.length === 0) {
            return NextResponse.json({ error: "No bank found" }, { status: 404 });
        }

        return NextResponse.json({ bank: bank[0] });
    } catch (error) {
        logger.error("Error fetching bank data:", error);
        return NextResponse.json({ error: "Failed to fetch bank data" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { name, semester, courseCode } = await req.json();

        const [newBank] = await db
            .insert(banksTable)
            .values({ name, semester, courseCode })
            .returning();

        return NextResponse.json({ bank: newBank }, { status: 201 });
    } catch (error) {
        logger.error("Error creating bank:", error);
        return NextResponse.json({ error: "Failed to create bank" }, { status: 500 });
    }
}
