import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/db/prismadb';
import { uploadFile } from '@/lib/db/minio';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        type Role = 'STUDENT' | 'ADMIN' | 'STAFF' | 'MANAGER';

        const name = formData.get('name')?.toString();
        const email = formData.get('email')?.toString();
        const password = formData.get('password')?.toString();
        const role = formData.get('role')?.toString() as Role;
        const phoneNo = formData.get('phoneNo')?.toString();
        const rollNo = formData.get('rollNo')?.toString();
        const imageFile = formData.get('image') as File | null;
        // const key = formData.get('key')?.toString();

        // if (key !== process.env.REGISTRATION_KEY) {
        //     return NextResponse.json(
        //         { error: 'Invalid registration key.' },
        //         { status: 401 }
        //     );
        // }

        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'Name, email, and password are required.' },
                { status: 400 }
            );
        }

        let imageUrl = null;
        if (imageFile) {
            try {
                const buffer = Buffer.from(await imageFile.arrayBuffer());
                const fileName = `${Date.now()}-${imageFile.name}`;
                imageUrl = await uploadFile(buffer, fileName, imageFile.type, 'profile-pics');
            } catch (uploadError) {
                console.error('Image upload failed:', uploadError);
            }
        }

        const hashedPassword = await hash(password, 10);
        const now = new Date();
        const userData = {
            name,
            email,
            password: hashedPassword,
            role: role || 'STUDENT',
            phoneNo: phoneNo || null,
            rollNo: rollNo || null,
            image: imageUrl,
            createdAt: now,
            lastPasswordChange: now,
            isActive: true
        };

        const newUser = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({ data: userData });

            if (user.role === 'STUDENT') {
                await tx.student.create({
                    data: {
                        id: user.id
                    }
                });
            } else if (user.role === 'STAFF') {
                await tx.staff.create({
                    data: {
                        id: user.id
                    }
                });
            } else if (user.role === 'MANAGER') {
                await tx.manager.create({
                    data: {
                        id: user.id
                    }
                })
            }

            return user;
        });

        const { password: _, ...userResponse } = newUser;

        return NextResponse.json({
            message: 'User registered successfully.',
            user: userResponse
        }, { status: 201 });

    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Email already exists.' },
                { status: 409 }
            );
        }

        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
