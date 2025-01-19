import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";
import { clearBankCache } from '@/lib/db/redis'

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

        const staff = await prisma.staff.findFirst({
            where: { id: session.user.id }
        });

        const bank = await prisma.bank.findFirst({
            where: {
                id: id,
                bankOwners: {
                    some: {
                        id: staff.id
                    }
                }
            }
        })

        if (!bank) {
            return NextResponse.json({ message: "Not found or not authorized" }, { status: 404 })
        }

        const body = await req.json()
        const { name, description, semester } = body
        const updatedBank = await prisma.bank.update({
            where: { id: id },
            data: { name, description, semester }
        })

        // Clear cache for the owner
        await clearBankCache(staff.id)

        return NextResponse.json(updatedBank)
    } catch (error) {
        console.log('Update bank error:', error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (session?.user?.role !== "STAFF") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }
        const { id } = await params;
        const staff = await prisma.staff.findFirst({
            where: { id: session.user.id }
        });

        if (!staff) {
            return NextResponse.json({ message: "Staff not found" }, { status: 404 })
        }

        const bank = await prisma.bank.findFirst({
            where: {
                id: id,
                bankOwners: {
                    some: {
                        id: staff.id
                    }
                }
            }
        })

        if (!bank) {
            return NextResponse.json({ message: "Not found or not authorized" }, { status: 404 })
        }

        await prisma.bank.delete({
            where: {
                id: id
            }
        })

        // Clear cache for the owner
        await clearBankCache(staff.id)

        return NextResponse.json({ message: "Bank deleted successfully" }, { status: 200 })
    } catch (error) {
        console.log('Delete bank error:', error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
    }
}
