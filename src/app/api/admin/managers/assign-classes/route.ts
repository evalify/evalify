import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { managerId, classIds } = body;

        if (!managerId || !Array.isArray(classIds)) {
            return NextResponse.json(
                { error: "Invalid request data" },
                { status: 400 }
            );
        }

        // First, verify that the manager exists
        const manager = await prisma.manager.findUnique({
            where: { id: managerId }
        });

        if (!manager) {
            return NextResponse.json(
                { error: "Manager not found" },
                { status: 404 }
            );
        }

        // Update the manager's class assignments
        // This will replace all existing assignments with the new ones
        const updatedManager = await prisma.manager.update({
            where: { id: managerId },
            data: {
                class: {
                    set: classIds.map(id => ({ id }))
                }
            },
            include: {
                class: {
                    select: {
                        name: true
                    }
                },
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });

        return NextResponse.json({
            message: "Classes assigned successfully",
            manager: updatedManager
        });
    } catch (error) {
        console.error("Error assigning classes:", error);
        return NextResponse.json(
            { error: "Failed to assign classes" },
            { status: 500 }
        );
    }
}

// Optional: Add GET method to fetch current assignments
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const managerId = searchParams.get('managerId');

        if (!managerId) {
            return NextResponse.json(
                { error: "Manager ID is required" },
                { status: 400 }
            );
        }

        const assignments = await prisma.manager.findUnique({
            where: { id: managerId },
            include: {
                class: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        return NextResponse.json({ assignments });
    } catch (error) {
        console.error("Error fetching assignments:", error);
        return NextResponse.json(
            { error: "Failed to fetch assignments" },
            { status: 500 }
        );
    }
}
