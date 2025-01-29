import { auth } from "@/lib/auth/auth";
import clientPromise from "@/lib/db/mongo";
import { NextResponse } from "next/server";

// Add this validation function at the top
function validateQuestionData(data: any) {
    if (!data.type || !data.difficulty || !data.question || !data.mark) {
        return { isValid: false, error: "Missing required fields" };
    }

    // Validate based on question type
    switch (data.type) {
        case 'MCQ':
        case 'TRUE_FALSE':
            if (!Array.isArray(data.options) || !Array.isArray(data.answer)) {
                return { isValid: false, error: "Invalid options or answer format" };
            }
            break;
        case 'DESCRIPTIVE':
            if (!data.expectedAnswer) {
                return { isValid: false, error: "Expected answer is required" };
            }
            break;
        case 'FILL_IN_BLANK':
            if (!data.expectedAnswer) {
                return { isValid: false, error: "Expected answer is required" };
            }
            break;
    }

    return { isValid: true };
}

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
        
        // Validate the data
        const validation = validateQuestionData(questionData);
        if (!validation.isValid) {
            return NextResponse.json({ 
                message: validation.error || "Invalid question data" 
            }, { status: 400 });
        }

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

        const db = (await clientPromise).db();
        
        const result = await db
            .collection('QUESTION_BANK')
            .insertOne(questionData);

        if (!result?.insertedId) {
            console.log('No insertedId in MongoDB response');
            throw new Error('Failed to get confirmation of question creation');
        }

        return NextResponse.json({ 
            message: "Question created successfully",
            questionId: result.insertedId 
        }, { status: 201 });

    } catch (error) {
        console.log('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        
        return NextResponse.json({ 
            message: "Failed to create question",
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
