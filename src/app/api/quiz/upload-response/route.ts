import { auth } from "@/lib/auth/auth";
import { NextRequest, NextResponse } from "next/server";
import { uploadQuizSubmission } from "@/lib/db/minio";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const quizId = formData.get('quizId') as string;
        const questionId = formData.get('questionId') as string;
        
        if (!file || !quizId || !questionId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileType = file.type || 'application/octet-stream';
        const rollNo = session.user.rollNo || session.user.id;

        const { url, fileInfo } = await uploadQuizSubmission(
            buffer,
            quizId,
            questionId,
            rollNo,
            fileType,
            file.name // Pass original filename
        );

        return NextResponse.json({ 
            url,
            fileInfo
        });
        
    } catch (error) {
        console.error('Error in upload route:', error);
        return NextResponse.json(
            { error: "Failed to upload file" },
            { status: 500 }
        );
    }
}
