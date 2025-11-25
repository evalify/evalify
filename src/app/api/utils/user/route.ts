import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db";
import { usersTable } from "@/db/schema";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
    try {
        const users = await db.select().from(usersTable);

        if (users.length === 0) {
            return NextResponse.json({ error: "No users found" }, { status: 404 });
        }

        return NextResponse.json({ users: users });
    } catch (error) {
        logger.error("Error fetching users data:", error);
        return NextResponse.json({ error: "Failed to fetch users data" }, { status: 500 });
    }
}
