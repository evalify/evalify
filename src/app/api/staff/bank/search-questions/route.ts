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

        const { bankIds, topics, difficulty, types, count, random } = await req.json();

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

        // Build MongoDB query
        let searchQuery: any = {
            bankId: { $in: authorizedBankIds }
        };

        // Only add filters if they are not empty
        if (topics && topics.length > 0) {
            searchQuery.topics = { $in: topics };
        }

        if (difficulty && difficulty.length > 0) {
            searchQuery.difficulty = { $in: difficulty };
        }

        if (types && types.length > 0) {
            searchQuery.type = { $in: types };
        }

        // Modified aggregation pipeline
        const pipeline = [
            { $match: searchQuery }
        ];

        if (random) {
            pipeline.push({ $sample: { size: parseInt(count) || 50 } });
        }

        // First get the questions
        const questions = await (await clientPromise)
            .db()
            .collection('QUESTION_BANK')
            .aggregate(pipeline)
            .toArray();

        // Then get analytics with a separate aggregation
        const analyticsAgg = await (await clientPromise)
            .db()
            .collection('QUESTION_BANK')
            .aggregate([
                { $match: searchQuery },
                {
                    $group: {
                        _id: null,
                        totalQuestions: { $sum: 1 },
                        difficulties: { $addToSet: "$difficulty" },
                        types: { $addToSet: "$type" },
                        topics: { $addToSet: "$topics" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalQuestions: 1,
                        byDifficulty: {
                            $arrayToObject: {
                                $map: {
                                    input: "$difficulties",
                                    as: "diff",
                                    in: {
                                        k: "$$diff",
                                        v: {
                                            $size: {
                                                $filter: {
                                                    input: questions,
                                                    cond: { $eq: ["$$this.difficulty", "$$diff"] }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        byType: {
                            $arrayToObject: {
                                $map: {
                                    input: "$types",
                                    as: "type",
                                    in: {
                                        k: "$$type",
                                        v: {
                                            $size: {
                                                $filter: {
                                                    input: questions,
                                                    cond: { $eq: ["$$this.type", "$$type"] }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ]).toArray();

        const analytics = analyticsAgg[0] || {
            totalQuestions: questions.length,
            byDifficulty: {},
            byType: {},
            byTopic: {}
        };

        return NextResponse.json({
            questions,
            analytics
        }, { status: 200 });
    } catch (error) {
        console.log('error:', error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
