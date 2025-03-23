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
        if (!session?.user?.role || (session.user.role !== "STAFF" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        // const staff = await prisma.staff.findFirst({
        //     where: {
        //         id: session.user.id
        //     }
        // });

        const bank = await prisma.bank.findFirst({
            where: {
                id: id,
                // bankOwners: {
                //     some: {
                //         id: staff?.id
                //     }
                // }
            },
            include: {
                staffs: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            }
        });

        if (!bank) {
            return NextResponse.json({ message: "Not authorized" }, { status: 401 })
        }

        return NextResponse.json(bank.staffs)
    } catch (error) {
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
    }
}
