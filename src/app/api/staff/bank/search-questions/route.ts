import { auth } from "@/lib/auth/auth";
import clientPromise from "@/lib/db/mongo";
import { prisma } from "@/lib/db/prismadb";
import { access } from "fs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.role || (session.user.role !== "STAFF" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { bankIds, topics, difficulty, types, count, random, quizId } = await req.json();
        const requestedCount = parseInt(count) || 50;

        let authorizedBankIds: string[] = [];

        // Validate staff has access to these banks
        if (session.user.role === "MANAGER") {
            const manager = await prisma.manager.findFirst({
                where: { id: session.user.id },
                include: {
                    class: true
                }
            });

            // Get all banks that belong to staff members who teach in manager's classes
            const staffsInClasses = await prisma.staff.findMany({
                where: {
                    courses: {
                        some: {
                            classId: {
                                in: manager?.class.map(c => c.id) || []
                            }
                        }
                    }
                },
                include: {
                    bank: true,
                    bankStaffs: true
                }
            });

            authorizedBankIds = [...new Set([
                ...staffsInClasses.flatMap(staff => staff.bank.map(b => b.id)),
                ...staffsInClasses.flatMap(staff => staff.bankStaffs.map(b => b.id))
            ])];

            const hasUnauthorizedBank = bankIds?.some(
                (bankId: string) => !authorizedBankIds.includes(bankId)
            );

            if (hasUnauthorizedBank) {
                return NextResponse.json(
                    { message: "Unauthorized: Can only search questions from managed banks" },
                    { status: 403 }
                );
            }
        }
        else if (session.user.role === "STAFF") {
            const staff = await prisma.staff.findFirst({
                where: { id: session.user.id },
                include: {
                    bank: true,
                    bankStaffs: true
                }
            });

            authorizedBankIds = [...new Set([
                ...(staff?.bank || []).map(b => b.id),
                ...(staff?.bankStaffs || []).map(b => b.id)
            ])];

            if (!bankIds.every(id => authorizedBankIds.includes(id))) {
                return NextResponse.json(
                    { message: "Unauthorized: Can only search questions from assigned banks" },
                    { status: 403 }
                );
            }
        }

        if (!authorizedBankIds.length) {
            return NextResponse.json(
                { message: "No accessible question banks found" },
                { status: 404 }
            );
        }

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
