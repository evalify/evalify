import { auth } from "@/lib/auth/auth";
import clientPromise from "@/lib/db/mongo";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const topicsParam = searchParams.get('topic');

        const session = await auth();
        if (!session?.user?.role || session.user.role !== "STAFF") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        let query = { bankId: id };

        if (topicsParam) {
            const searchTopics = topicsParam.split(',').filter(Boolean).map(t => t.trim());
            if (searchTopics.length > 0) {
                query = {
                    ...query,
                    topics: {
                        $elemMatch: { $in: searchTopics }
                    }
                };
            }
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

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.role || session.user.role !== "STAFF") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const question = await req.json();

        const topics = Array.isArray(question.topics) ? question.topics : [question.topics].filter(Boolean);

        const { _id, ...questionData } = question;

        const newQuestion = await (await clientPromise)
            .db()
            .collection('QUESTION_BANK')
            .insertOne({
                ...questionData,
                topics,
                bankId: id,
            });

        return NextResponse.json(newQuestion, { status: 201 });
    } catch (error) {
        console.log('error:', error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
