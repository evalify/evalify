import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";
import { clearBankCache } from '@/lib/db/redis'

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.role || (session.user.role !== "STAFF" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const bank = await prisma.bank.findFirst({
            where: {
                id: params.id
            }
        })

        if (!bank) {
            return NextResponse.json({ message: "Not found or not authorized" }, { status: 404 })
        }

        const { staffId } = await req.json()

        const updatedBank = await prisma.bank.update({
            where: { id: params.id },
            data: {
                bankOwners: {
                    connect: { id: staffId }
                }
            }
        })

        // Clear cache for both current owner and new owner
        await Promise.all([
            clearBankCache(staffId)
        ])

        // Add no-cache headers
        return NextResponse.json(updatedBank, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache'
            }
        })
    } catch (error) {
        console.log('Promote to owner error:', error);
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

        const bank = await prisma.bank.findFirst({
            where: {
                id: params.id,
            },
            include: {
                bankOwners: true
            }
        })

        if (!bank) {
            return NextResponse.json({ message: "Not found or not authorized" }, { status: 404 })
        }

        const { staffId } = await req.json()

        // Prevent removing the last owner
        if (bank.bankOwners.length <= 1) {
            return NextResponse.json({
                message: "Cannot remove the last owner"
            }, { status: 400 })
        }

        // Prevent self-demotion
        if (staffId === session.user.id) {
            return NextResponse.json({
                message: "Cannot demote yourself"
            }, { status: 400 })
        }

        const updatedBank = await prisma.bank.update({
            where: { id: params.id },
            data: {
                bankOwners: {
                    disconnect: { id: staffId }
                },
                staffs: {
                    connect: { id: staffId } // Keep them as a staff member
                }
            }
        })

        // Clear cache for both current owner and demoted staff
        await Promise.all([
            clearBankCache(staffId)
        ])

        // Revalidate the cache for this bank
        await fetch(`${req.headers.get('origin')}/api/revalidate?path=/staff/bank/${params.id}`, {
            method: 'POST'
        });

        // Add no-cache headers
        return NextResponse.json(updatedBank, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache'
            }
        })
    } catch (error) {
        console.log('Demote owner error:', error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
    }
}
