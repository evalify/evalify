import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prismadb";
import { auth } from "@/lib/auth/auth";

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.role || (session.user.role !== "STAFF" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }


        const body = await request.json();
        const { showResult } = body;

        if (typeof showResult !== 'boolean') {
            return NextResponse.json(
                { error: "showResult must be a boolean value" },
                { status: 400 }
            );
        }

        const settings = await prisma.quiz.findUnique({
            where: {
                id
            },
            select: {
                settingsId: true
            }
        });

        if (!settings) {
            return NextResponse.json(
                { error: "Quiz not found" },
                { status: 404 }
            );
        }

        // Update the settings
        const updatedSettings = await prisma.quizSettings.update({
            where: {
                id: settings?.settingsId
            },
            data: {
                showResult
            }
        });

        return NextResponse.json(updatedSettings);

    } catch (error) {
        console.error('Settings update error:', error);
        return NextResponse.json(
            { error: "Failed to update settings" },
            { status: 500 }
        );
    }
}