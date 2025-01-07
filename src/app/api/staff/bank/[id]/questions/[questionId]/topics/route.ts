import { auth } from "@/lib/auth/auth";
import clientPromise from "@/lib/db/mongo";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// Export the PATCH handler correctly with named export
export const PATCH = async (
    req: Request,
    { params }: { params: { id: string, questionId: string } }
) => {
    try {
        const { id, questionId } = params;
        const session = await auth();
        if (!session?.user?.role || session.user.role !== "STAFF") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { topics } = await req.json();

        if (!Array.isArray(topics)) {
            return NextResponse.json({ message: "Invalid topics format" }, { status: 400 });
        }

        const objectId = new ObjectId(questionId);
        const result = await (await clientPromise)
            .db()
            .collection('QUESTION_BANK')
            .updateOne(
                { _id: objectId, bankId: id },
                { $set: { topics } }
            );

        if (result.matchedCount === 0) {
            return NextResponse.json({ message: "Question not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Topics updated successfully" });
    } catch (error) {
        console.log('error:', error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
};
