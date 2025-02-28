import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';

        console.log({ search })
        const managers = await prisma.manager.findMany({
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
                    }
                },
                class: {
                    select: {
                        id: true,  // Include id in the selection
                        name: true,
                    }
                }
            }
        });
        console.log({ managers })

        return NextResponse.json({ managers }, { status: 200 }); // Return as an object with managers key
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch managers" }, { status: 500 });
    }
}