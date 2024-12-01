import NextAuth from "next-auth";
import Credentials from 'next-auth/providers/credentials';
import { prisma } from "../db/prismadb";
import { compare } from "bcryptjs";


export const { handlers, auth, signIn, signOut } = NextAuth({
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
        Credentials({
            credentials: {
                rollNo: { label: "Rollno", type: "text" },
                password: { label: "Password", type: "password" }
            },

            async authorize(credentials) {
                const user = await prisma.user.findFirst({
                    where: {
                        rollNo: credentials?.rollNo as string,
                    },
                    select: {
                        rollNo: true,
                        password: true,
                        role: true,
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                })

                const isCrtPassword = await compare(credentials?.password as string, user?.password as string);


                if (user && isCrtPassword) {
                    delete user?.password;
                    // remove password from user object
                    return user;
                }

                return null;
            }
        })
    ],
    callbacks: {
        authorized({ request: { nextUrl }, auth }) {
            const isLoggined = !!auth?.user;
            const { pathname } = nextUrl
            if (isLoggined && pathname === "/auth/login") {
                return Response.redirect(new URL("/", nextUrl.origin));
            }
            return !!auth;
        },
        async jwt({ token, user }) {
            if (user) {
                token = { ...token, user }
            }
            return token;
        },
        async session({ session, token }) {
            session = { ...session, ...token }
            return session;
        }
    },
    pages: {
        signIn: "/auth/login",
    },
})






// import AuthentikProvider from "next-auth/providers/authentik";



// export const config = {
//     providers: [
//         AuthentikProvider({
//             clientId: process.env.AUTHENTIK_CLIENT_ID!,
//             clientSecret: process.env.AUTHENTIK_CLIENT_SECRET!,
//             issuer: process.env.AUTHENTIK_ISSUER!,
//             wellKnown: `${process.env.AUTHENTIK_ISSUER!}/.well-known/openid-configuration`,
//             authorization: {
//                 params: {
//                     scope: "openid email profile",
//                     response_type: "code",
//                 }
//             }
//         }),
//     ],
//     pages: {
//         signIn: "/login",
//     },
//     debug: process.env.NODE_ENV === "development",
//     callbacks: {
//         redirect({ url, baseUrl }) {
//             return url.startsWith(baseUrl) ? url : baseUrl;
//         }
//     }
// };

// export const { auth, signIn, signOut } = NextAuth(config);

