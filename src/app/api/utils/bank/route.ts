import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db";
import { banksTable, bankUsersTable } from "@/db/schema";
import { logger } from "@/lib/logger";

export async function GET(_req: NextRequest) {
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
        const { name, semester, courseCode, createdById, sharedUserIds } = await req.json();

        // Create the bank and share with users in a transaction
        const result = await db.transaction(async (tx) => {
            // Create the bank
            const [newBank] = await tx
                .insert(banksTable)
                .values({ name, semester, courseCode, createdById })
                .returning();

            // Share with users if sharedUserIds is provided
            let sharedUsers: (typeof bankUsersTable.$inferSelect)[] = [];
            if (sharedUserIds && Array.isArray(sharedUserIds) && sharedUserIds.length > 0) {
                sharedUsers = await tx
                    .insert(bankUsersTable)
                    .values(
                        sharedUserIds.map((userId) => ({
                            bankId: newBank.id,
                            userId,
                            accessLevel: "WRITE" as const,
                        }))
                    )
                    .returning();
            }

            return { bank: newBank, sharedUsers };
        });

        logger.info(
            {
                bankId: result.bank.id,
                name,
                createdById,
                sharedCount: result.sharedUsers.length,
            },
            "Bank created and shared"
        );

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        logger.error({ error }, "Error creating bank");
        return NextResponse.json({ error: "Failed to create bank" }, { status: 500 });
    }
}
