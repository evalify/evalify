import { NextRequest, NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { prisma } from '@/lib/db/prismadb';



export async function GET(req: NextRequest) {
    try {
        const email = req.nextUrl.searchParams.get('email');
        const rollNo = req.nextUrl.searchParams.get('rollNo');

        if (!email && !rollNo) {
            return NextResponse.json({ error: 'Email or Roll Number is required.' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: rollNo ? { rollNo } : { email },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phoneNo: true,
                rollNo: true,
                image: true,
                isActive: true,
                createdAt: true,
                lastPasswordChange: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        return NextResponse.json({ user });
    } catch (error) {
        console.log('Error fetching user profile:', error);
        return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }
}


export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, name, phoneNo, image } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { email },
            data: { phoneNo, image, name },
        });

        return NextResponse.json({ message: 'Profile updated successfully.', user: updatedUser });
    } catch (error) {
        console.log('Error updating user profile:', error);
        return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }
}


export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, oldPassword, newPassword } = body;

        if (!email || !oldPassword || !newPassword) {
            return NextResponse.json({
                error: 'Email, current password, and new password are required.'
            }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                password: true,
                createdAt: true,
                lastPasswordChange: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        const isFirstTimeChange = new Date(user.createdAt).getTime() === new Date(user.lastPasswordChange).getTime();

        if (!isFirstTimeChange && !(await compare(oldPassword, user.password))) {
            return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
        }

        const hashedPassword = await hash(newPassword, 10);

        await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                lastPasswordChange: new Date()
            },
        });

        return NextResponse.json({ message: 'Password changed successfully.' });
    } catch (error) {
        console.error('Error changing password:', error);
        return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }
}
