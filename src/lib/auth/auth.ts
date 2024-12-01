import NextAuth, { DefaultSession, User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "../db/prismadb";
import { AdapterUser } from "next-auth/adapters";
import { compare } from "bcryptjs";


declare module "next-auth/jwt" {
    interface JWT {
        id: string;
    }
}


export const { handlers, auth, signIn, signOut } = NextAuth({
    session: {
        strategy: "jwt",
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
                    console.log({ credentials });
                    if (!credentials?.rollNo || !credentials?.password) {
                        throw new Error("Missing roll number or password");
                    }

                    const user = await prisma.user.findFirst({
                        where: { rollNo: credentials.rollNo },
                    });

                    if (!user) {
                        throw new Error("User not found");
                    }

                    const isPasswordValid = await compare(String(credentials.password), String(user.password));
                    if (!isPasswordValid) {
                        throw new Error("Invalid credentials");
                    }

                    const { password, ...safeUser } = user;
                    return safeUser;
                } catch (error) {
                    if (error instanceof Error) {
                        console.error("Authorization error:", error.message);
                    } else {
                        console.error("Authorization error:", error);
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
        error: "/auth/error", // Redirect to error page
    },
});
