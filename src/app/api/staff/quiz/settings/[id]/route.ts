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
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { showResult } = body;

        if (typeof showResult !== 'boolean') {
            return NextResponse.json(
                { error: "showResult must be a boolean value" },
                { status: 400 }
            );
        }

        // Verify the staff has permission to update this quiz
        const staff = await prisma.staff.findFirst({
            where: {
                user: {
                    email: session.user.email
                }
            }
        });

        if (!staff) {
            return NextResponse.json(
                { error: "Staff not found" },
                { status: 404 }
            );
        }

        // Find the quiz to verify ownership
        const quiz = await prisma.quiz.findFirst({
            where: {
                settings: {
                    id: id
                },
                createdbyId: staff.id
            }
        });

        if (!quiz) {
            return NextResponse.json(
                { error: "Quiz not found or unauthorized" },
                { status: 404 }
            );
        }

        // Update the settings
        const updatedSettings = await prisma.quizSettings.update({
            where: {
                id: id
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
