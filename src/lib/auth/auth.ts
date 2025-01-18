import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "../db/prismadb";
import { compare, hash } from "bcryptjs";
import { type IUser } from "../types/next-auth";

// Only log critical errors
const logCriticalError = (error: unknown) => {
    if (error instanceof Error) {
        console.error("[Critical Error]", error.message);
    }
};

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    session: {
        strategy: "jwt",
        maxAge: 5 * 60 * 60,
    },
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
        Credentials({
            credentials: {
                rollNo: { label: "RollNumber", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials): Promise<IUser | null> {
                try {
                    if (!credentials?.rollNo || !credentials?.password) {
                        return null;
                    }

                    let user = await prisma.user.findFirst({
                        where: { rollNo: credentials.rollNo },
                    }).catch(() => null);

                    // Admin creation code remains unchanged
                    if (!user && credentials.rollNo === "admin" && credentials.password === "admin") {
                        user = await prisma.user.create({
                            data: {
                                name: "admin",
                                email: "admin@gmail.com",
                                password: await hash("admin", 10),
                                role: "ADMIN",
                                isActive: true,
                                phoneNo: '',
                                rollNo: "admin",
                                createdAt: new Date(),
                                lastPasswordChange: new Date(),
                            },
                        })
                    }

                    if (!user || !user.isActive) {
                        return null;
                    }

                    const isPasswordValid = await compare(
                        String(credentials.password),
                        String(user.password)
                    ).catch(() => false);

                    if (!isPasswordValid) {
                        return null;
                    }

                    const { password, ...safeUser } = user;

                    if (safeUser.role === "STUDENT") {
                        const classId = await prisma.student.findFirst({
                            where: { id: safeUser.id },
                            select: { classId: true },
                        });
                        return {
                            ...safeUser,
                            classId: classId?.classId,
                        } as IUser;
                    }

                    return safeUser as IUser;

                } catch (error) {
                    logCriticalError(error);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.user = user as IUser;
            }
            return token;
        },
        async session({ session, token }) {
            session.user = token.user;
            return session;
        },
    },
    pages: {
        signIn: "/auth/login",
        error: "/auth/error",
    },
});
