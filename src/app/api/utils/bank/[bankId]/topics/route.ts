import { db } from "@/db";
import { eq } from "drizzle-orm";
import { topicsTable } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ bankId: string }> }) {
    try {
        const { bankId } = await params;

        const bankTopics = await db
            .select()
            .from(topicsTable)
            .where(eq(topicsTable.bankId, bankId));

        return NextResponse.json({ topics: bankTopics });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch topics" }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ bankId: string }> }) {
    try {
        const { bankId } = await params;
        const { name } = await req.json();

        const [newTopic] = await db.insert(topicsTable).values({ bankId, name }).returning();

        return NextResponse.json({ topic: newTopic }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create topic" }, { status: 500 });
    }
}
