import { auth } from "@/lib/auth/auth";
import clientPromise from "@/lib/db/mongo";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function DELETE(
    req: Request,
    { params }: { params: { id: string, questionId: string } }
) {
    try {
        const { id, questionId } = await params;
        const session = await auth();
        if (!session?.user?.role || (session.user.role !== "STAFF" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        let objectId;
        try {
            objectId = new ObjectId(questionId);
        } catch (error) {
            return NextResponse.json({ message: "Invalid question ID" }, { status: 400 });
        }

        const client = await clientPromise;
        const result = await client
            .db()
            .collection('QUESTION_BANK')
            .deleteOne({
                _id: objectId,
                bankId: id
            });

        if (result.deletedCount === 0) {
            return NextResponse.json({ message: "Question not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Question deleted successfully" });
    } catch (error) {
        console.log('error:', error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string, questionId: string } }
) {
    try {
        const { id, questionId } = await params;
        const session = await auth();
        if (!session?.user?.role || (session.user.role !== "STAFF" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        let objectId;
        try {
            objectId = new ObjectId(questionId);
        } catch (error) {
            return NextResponse.json({ message: "Invalid question ID" }, { status: 400 });
        }

        const updatedQuestion = await req.json();

        // Remove _id from the update data
        const { _id, id: questionId2, ...updateData } = updatedQuestion;

        // Ensure options have IDs for MCQ questions
        if (updateData.type === 'MCQ' && Array.isArray(updateData.options)) {
            updateData.options = updateData.options.map(opt => {
                if (!opt.optionId) {
                    return {
                        ...opt,
                        optionId: crypto.randomUUID().replace(/-/g, '')
                    };
                }
                return opt;
            });
        }

        const client = await clientPromise;
        const result = await client
            .db()
            .collection('QUESTION_BANK')
            .updateOne(
                {
                    _id: objectId,
                    bankId: id
                },
                { $set: updateData }
            );

        if (result.matchedCount === 0) {
            return NextResponse.json({ message: "Question not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Question updated successfully" });
    } catch (error) {
        console.log('error:', error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
