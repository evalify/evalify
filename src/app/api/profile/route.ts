import { NextRequest, NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { prisma } from '@/lib/db/prismadb';

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get user profile
 *     description: Retrieve user profile information using email or roll number
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: User's email address
 *       - in: query
 *         name: rollNo
 *         schema:
 *           type: string
 *         description: User's roll number
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     name: { type: string }
 *                     email: { type: string }
 *                     role: { type: string }
 *                     phoneNo: { type: string }
 *                     rollNo: { type: string }
 *                     image: { type: string }
 *                     isActive: { type: boolean }
 *                     createdAt: { type: string }
 *                     lastPasswordChange: { type: string }
 *       400:
 *         description: Bad request - Email or Roll Number is required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/profile:
 *   put:
 *     summary: Update user profile
 *     description: Update user profile information like name, phone number, and image
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email: { type: string }
 *               name: { type: string }
 *               phoneNo: { type: string }
 *               image: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 user: { type: object }
 *       400:
 *         description: Bad request - Email is required
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/profile:
 *   patch:
 *     summary: Change user password
 *     description: Update user's password with verification of old password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               email: { type: string }
 *               oldPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       400:
 *         description: Bad request - Missing required fields
 *       401:
 *         description: Unauthorized - Current password is incorrect
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
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
