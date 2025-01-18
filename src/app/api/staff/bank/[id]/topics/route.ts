import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req : NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;

        const session = await auth();
        if (!session?.user?.role || session.user.role !== "STAFF") {
            return NextResponse.json({ message: "Unauthorized", topics: [] }, { status: 401 })
        }

        const bank = await prisma.bank.findFirst({
            where: {
                id: id
            },
            include: {
                topics: true
            }
        })

        if (!bank) {
            return NextResponse.json({ message: "Not found or not authorized", topics: [] }, { status: 404 })
        }

        return NextResponse.json({
            topics: bank.topics,
        }, { status: 200 })
    } catch (error) {
        console.log('error:', error);
        return NextResponse.json({ message: "Internal Server Error", topics: [] }, { status: 500 })
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
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const { name } = await req.json();

        const bank = await prisma.bank.update({
            where: { id: id },
            data: {
                topics: {
                    create: {
                        name
                    }
                }
            },
            include: {
                topics: true
            }
        });

        return NextResponse.json(bank, { status: 201 });
    } catch (error) {
        console.log('error:', error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.role || session.user.role !== "STAFF") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const { topicId, name } = await req.json();

        const updatedTopic = await prisma.topic.update({
            where: { id: topicId },
            data: { name }
        });

        const bank = await prisma.bank.findUnique({
            where: { id },
            include: { topics: true }
        });

        return NextResponse.json({ bank, updatedTopic }, { status: 200 });
    } catch (error) {
        console.log('error:', error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.role || session.user.role !== "STAFF") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const { topicId } = await req.json();

        const bank = await prisma.bank.update({
            where: { id },
            data: {
                topics: {
                    disconnect: { id: topicId }
                }
            },
            include: {
                topics: true
            }
        });

        return NextResponse.json(bank, { status: 200 });
    } catch (error) {
        console.log('error:', error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
    }
}
