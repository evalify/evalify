import { auth } from "@/lib/auth/auth";
import clientPromise from "@/lib/db/mongo";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.role || session.user.role !== "STAFF") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { bankIds, topics, difficulty, types } = await req.json();

        // Validate staff has access to these banks
        const staff = await prisma.staff.findFirst({
            where: { userId: session.user.id }
        });

        const accessibleBanks = await prisma.bank.findMany({
            where: {
                id: { in: bankIds },
                OR: [
                    { staffs: { some: { id: staff.id } } },
                    { bankOwners: { some: { id: staff.id } } }
                ]
            }
        });

        const authorizedBankIds = accessibleBanks.map(bank => bank.id);

        // Build MongoDB query
        let query: any = {
            bankId: { $in: authorizedBankIds }
        };

        if (topics && topics.length > 0) {
            query.topics = { $elemMatch: { $in: topics } };
        }

        if (difficulty && difficulty.length > 0) {
            query.difficulty = { $in: difficulty };
        }

        if (types && types.length > 0) {
            query.type = { $in: types };
        }

        const questions = await (await clientPromise)
            .db()
            .collection('QUESTION_BANK')
            .find(query)
            .toArray();

        return NextResponse.json({ questions }, { status: 200 });
    } catch (error) {
        console.log('error:', error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
