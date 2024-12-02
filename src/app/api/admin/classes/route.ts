import { prisma } from "@/lib/db/prismadb";
import { NextResponse } from "next/server";

// GET all classes
export async function GET() {
    try {
        const classes = await prisma.class.findMany({
            include: {
                _count: {
                    select: { students: true }
                }
            }
        });
        return NextResponse.json(classes);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 });
    }
}

// POST to add a class
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const newClass = await prisma.class.create({
            data: {
                name: body.name,
                department: body.department,
                semester: body.semester,
                batch: body.batch,
            },
        });
        return NextResponse.json(newClass, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
    }
}

// PUT to update a class
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const updatedClass = await prisma.class.update({
            where: { id: body.id },
            data: {
                name: body.name,
                department: body.department,
                semester: body.semester,
                batch: body.batch,
            },
        });
        return NextResponse.json(updatedClass);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update class' }, { status: 500 });
    }
}

// DELETE a class
export async function DELETE(req: Request) {
    try {
        const url = new URL(req.url);
        const id = url.searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }
        await prisma.class.delete({
            where: { id },
        });
        return NextResponse.json({ message: 'Class deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 });
    }
}
