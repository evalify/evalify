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

        const { bankIds, topics, difficulty, types, count, random, quizId } = await req.json();
        const requestedCount = parseInt(count) || 50;

        // Validate staff has access to these banks
        const staff = await prisma.staff.findFirst({
            where: { id: session.user.id }
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

        // Get existing quiz questions
        const existingQuizQuestions = await (await clientPromise)
            .db()
            .collection('NEW_QUESTIONS')
            .find({ quizId })
            .project({ question: 1, content: 1, type: 1 })
            .toArray();

        // Create lookup set for fast duplicate checking
        const existingKeys = new Set(
            existingQuizQuestions.map(q => {
                const content = (q.question || q.content || '').toLowerCase().trim();
                return `${content}::${q.type.toLowerCase()}`;
            })
        );

        // Build base query
        let searchQuery: any = {
            bankId: { $in: authorizedBankIds }
        };

        if (topics?.length > 0) searchQuery.topics = { $in: topics };
        if (difficulty?.length > 0) searchQuery.difficulty = { $in: difficulty };
        if (types?.length > 0) searchQuery.type = { $in: types };

        // First fetch more questions than needed to account for duplicates
        const pipeline = [
            { $match: searchQuery }
        ];

        if (random) {
            // Fetch 3x the requested amount to ensure we have enough after filtering
            pipeline.push({ $sample: { size: requestedCount * 3 } });
        }

        let questions = await (await clientPromise)
            .db()
            .collection('QUESTION_BANK')
            .aggregate(pipeline)
            .toArray();

        // Filter out duplicates and limit to requested count
        questions = questions.filter(q => {
            const content = (q.question || q.content || '').toLowerCase().trim();
            const key = `${content}::${q.type.toLowerCase()}`;
            return !existingKeys.has(key);
        }).slice(0, requestedCount);

        return NextResponse.json({ questions }, { status: 200 });
    } catch (error) {
        console.log('error:', error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
