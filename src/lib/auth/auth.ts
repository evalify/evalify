import NextAuth, { User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "../db/prismadb";
import { AdapterUser } from "next-auth/adapters";
import { compare, hash } from "bcryptjs";


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
            async authorize(credentials) {
                try {
                    if (!credentials?.rollNo || !credentials?.password) {
                        throw new Error("Missing roll number or password");
                    }

                    let user = await prisma.user.findFirst({
                        where: { rollNo: credentials.rollNo },
                    });

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

                    if (!user) {
                        throw new Error("User not found");
                    }

                    const isPasswordValid = await compare(String(credentials.password), String(user.password));
                    if (!isPasswordValid) {
                        throw new Error("Invalid credentials");
                    }

                    const { password, ...safeUser } = user;

                    if (safeUser.role === "STUDENT") {
                        const classId = await prisma.student.findFirst({
                            where: { userId: safeUser.id },
                            select: { classId: true },
                        })
                        safeUser.classId = classId?.classId;
                    }

                    return safeUser;

                } catch (error) {
                    if (error instanceof Error) {
                        console.log("Authorization error:", error.message);
                    } else {
                        console.log("Authorization error:", error);
                    }
                    throw new Error("Invalid credentials");
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.user = user;
            }
            return token;
        },
        async session({ session, token }) {
            session.user = token.user as AdapterUser & User;
            return session;
        },
    },
    pages: {
        signIn: "/auth/login",
        error: "/auth/error",
    },
});
