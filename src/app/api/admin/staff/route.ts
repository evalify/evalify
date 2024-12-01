import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';

        const staff = await prisma.staff.findMany({
            where: {
                user: {
                    name: {
                        contains: search,
                        mode: 'insensitive'
                    }
                }
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        phoneNo: true
                    }
                },
                courses: {
                    where: {
                        isactive: true
                    },
                    select: {
                        name: true,
                        code: true
                    }
                }
            }
        });
        return NextResponse.json(staff);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
    }
}