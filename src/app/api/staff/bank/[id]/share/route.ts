import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";
import { clearBankCache } from '@/lib/db/redis'

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session?.user?.role || (session.user.role !== "STAFF" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }


        const { id } = await params;
        const bank = await prisma.bank.findFirst({
            where: {
                id: id,
            }
        })

        if (!bank) {
            return NextResponse.json({ message: "Not found or not authorized" }, { status: 404 })
        }

        const { staffId } = await req.json()

        await prisma.bank.update({
            where: { id: id },
            data: {
                staffs: {
                    connect: { id: staffId }
                }
            }
        })

        // Clear cache for both owner and new staff member
        await Promise.all([
            clearBankCache(staffId)
        ])

        return NextResponse.json({ message: "Bank shared successfully" })
    } catch (error) {
        console.log('Share bank error:', error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.role || (session.user.role !== "STAFF" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const { staffId } = await req.json()
        const {id} = await params;
        const bank = await prisma.bank.findFirst({
            where: {
                id: id,
            }
        })

        if (!bank) {
            return NextResponse.json({ message: "Not found or not authorized" }, { status: 404 })
        }

        await prisma.bank.update({
            where: { id: id },
            data: {
                staffs: {
                    disconnect: { id: staffId }
                }
            }
        })

        // Clear cache for both owner and removed staff member
        await Promise.all([
w            clearBankCache(staffId)
        ])

        return NextResponse.json({ message: "Access removed successfully" })
    } catch (error) {
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
    }
}
