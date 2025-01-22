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
            const topicIds = topicsParam.split(',').filter(Boolean);
            if (topicIds.length > 0) {
                query = {
                    ...query,
                    topics: {
                        $in: topicIds 
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

        const questionData = await req.json();
        console.log(questionData)
        // Ensure bankId is set
        questionData.bankId = id;
        
        // Add creation metadata
        questionData.createdBy = session.user.id;
        questionData.createdAt = new Date().toISOString();

        // For MCQ questions, ensure options have IDs
        if (questionData.type === 'MCQ' && Array.isArray(questionData.options)) {
            questionData.options = questionData.options.map(opt => ({
                ...opt,
                optionId: opt.optionId || crypto.randomUUID().replace(/-/g, '')
            }));
        }

        const result = await (await clientPromise)
            .db()
            .collection('QUESTION_BANK')
            .insertOne(questionData);

        if (!result.acknowledged) {
            throw new Error('Failed to insert question');
        }

        return NextResponse.json({ 
            message: "Question created successfully",
            questionId: result.insertedId 
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating question:', error);
        return NextResponse.json({ 
            message: "Failed to create question" 
        }, { status: 500 });
    }
}
