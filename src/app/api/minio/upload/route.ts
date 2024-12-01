import minioClient from "@/lib/db/minio";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fileName, fileContent } = body;

        await minioClient.putObject(
            "assignments",
            fileName,
            Buffer.from(fileContent, "base64")
        );

        return NextResponse.json({ 
            success: true, 
            message: "File uploaded successfully" 
        });
    } catch (error) {
        console.error("MinIO upload error:", error);
        return NextResponse.json(
            { success: false, error: "File upload failed" },
            { status: 500 }
        );
    }
}
