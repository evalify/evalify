import { NextRequest, NextResponse } from 'next/server';
import minioClient from "@/lib/db/minio";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const fileName = searchParams.get('fileName');

    if (!fileName) {
        return NextResponse.json(
            { error: "Filename is required" },
            { status: 400 }
        );
    }

    try {
        const stream = await minioClient.getObject("assignments", fileName);
        
        // Convert stream to Response
        const response = new Response(stream);
        
        // Add headers
        response.headers.set('Content-Disposition', `attachment; filename=${fileName}`);
        
        return response;
    } catch (error) {
        console.error("MinIO fetch error:", error);
        return NextResponse.json(
            { error: "File fetch failed" },
            { status: 500 }
        );
    }
}
