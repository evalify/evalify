import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
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
                id: id,
            },
            select: {
                topics: true
            }
        })

        if (!bank) {
            return NextResponse.json({ message: "Not found or not authorized", topics: [] }, { status: 404 })
        }

        return NextResponse.json({ topics: bank.topics || [] }, { status: 200 })
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
                    push: name
                }
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

        const { index, name } = await req.json();

        const bank = await prisma.bank.findUnique({
            where: { id: id }
        });

        if (!bank) {
            return NextResponse.json({ message: "Bank not found" }, { status: 404 });
        }

        const updatedTopics = [...bank.topics];
        updatedTopics[index] = name;

        const updatedBank = await prisma.bank.update({
            where: { id: id },
            data: { topics: updatedTopics }
        });

        return NextResponse.json(updatedBank, { status: 200 });
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

        const { index } = await req.json();

        const bank = await prisma.bank.findUnique({
            where: { id: id }
        });

        if (!bank) {
            return NextResponse.json({ message: "Bank not found" }, { status: 404 });
        }

        const updatedTopics = bank.topics.filter((_, i) => i !== index);

        const updatedBank = await prisma.bank.update({
            where: { id: id },
            data: { topics: updatedTopics }
        });

        return NextResponse.json(updatedBank, { status: 200 });
    } catch (error) {
        console.log('error:', error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
    }
}
