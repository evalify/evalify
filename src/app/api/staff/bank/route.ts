import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";
import { redis, CACHE_KEYS, clearBankCache } from "@/lib/db/redis";
import clientPromise from "@/lib/db/mongo";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.role || (session.user.role !== "STAFF" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const query = searchParams.get('q') || ''
        const semester = searchParams.get('semester') || ''
        const sort = searchParams.get('sort') || 'name'

        const staff = await prisma.staff.findFirst({
            where: { id: session.user.id }
        });

        // Try to get from cache first
        const cacheKey = CACHE_KEYS.bankSearch(query + semester + sort, staff.id)
        const cached = await redis.get(cacheKey)
        if (cached) {
            return NextResponse.json(JSON.parse(cached))
        }

        // Parse sort parameter
        let orderBy: any = {};
        switch (sort) {
            case 'name_desc':
                orderBy = { name: 'desc' };
                break;
            case 'createdAt':
                orderBy = { createdAt: 'desc' };
                break;
            case 'createdAt_asc':
                orderBy = { createdAt: 'asc' };
                break;
            case 'semester_desc':
                orderBy = { semester: 'desc' };
                break;
            case 'semester_asc':
                orderBy = { semester: 'asc' };
                break;
            default:
                orderBy = { name: 'asc' };
        }

        // Modify query based on role
        const whereClause = session.user.role === "MANAGER"
            ? {
                AND: [
                    {
                        OR: [
                            { name: { contains: query, mode: 'insensitive' } },
                            { description: { contains: query, mode: 'insensitive' } }
                        ]
                    },
                    semester ? { semester: { equals: semester } } : {}
                ]
            }
            : {
                OR: [
                    { staffs: { some: { id: staff.id } } },
                    { bankOwners: { some: { id: staff.id } } }
                ],
                AND: [
                    {
                        OR: [
                            { name: { contains: query, mode: 'insensitive' } },
                            { description: { contains: query, mode: 'insensitive' } }
                        ]
                    },
                    semester ? { semester: { equals: semester } } : {}
                ]
            };

        const banks = await prisma.bank.findMany({
            where: whereClause,
            orderBy,
            include: {
                bankOwners: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    }
                },
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
                },
                topics: true // Add this to include topics
            }
        })

        const banksWithOwnership = banks.map(bank => ({
            ...bank,
            isOwner: session.user.role === "MANAGER" ? true : bank.bankOwners.some(owner => owner.id === staff.id)
        }))

        // Get number of questions in each bank from mongoDB and include topic count
        const banksWithQuestions = await Promise.all(banksWithOwnership.map(async bank => {
            const questions = await (await clientPromise).db().collection('QUESTION_BANK').find({ bankId: bank.id }).toArray()
            return {
                ...bank,
                questions: questions.length,
                topicsCount: bank.topics?.length || 0 // Use the actual topics array length
            }
        }))

        await redis.setex(cacheKey, 300, JSON.stringify(banksWithQuestions))

        return NextResponse.json(banksWithQuestions)
    } catch (error) {
        console.log('Error fetching banks:', error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.role || (session.user.role !== "STAFF" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        const staff = await prisma.staff.findFirst({
            where: {
                id: session.user.id
            }
        });

        if (!staff) {
            return NextResponse.json({ message: "Staff record not found" }, { status: 404 })
        }

        const body = await req.json()
        const { name, description, semester } = body

        const bank = await prisma.bank.create({
            data: {
                name,
                description,
                semester,
                createdAt: new Date(),
                bankOwners: {
                    connect: {
                        id: staff.id
                    }
                },
                staffs: {
                    connect: {
                        id: staff.id
                    }
                }
            },
            include: {
                bankOwners: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    }
                },
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
        })
        await clearBankCache(staff.id)

        return NextResponse.json(bank, { status: 201 })
    } catch (error) {
        console.log('Bank creation error:', error);
        return NextResponse.json({
            message: "Internal Server Error",
            error: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 })
    }
}