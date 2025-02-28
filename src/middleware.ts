import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const publicPaths = ['/ide', "/", "/forum"];

export async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname, origin } = req.nextUrl;

    const absolute = (path: string) => `${origin}${path}`;

    // Allow access to change-password page even when authenticated
    if (pathname === '/auth/change-password') {
        return NextResponse.next();
    }

    if (pathname.startsWith("/quiz") && token?.user.role === "STUDENT") {
        return NextResponse.next();
    }

    // Handle role-based routes
    const roleRoutes = {
        '/student': 'STUDENT',
        '/admin': 'ADMIN',
        '/staff': 'STAFF',
        '/manager' : "MANAGER"
    };

    // Create absolute URL helper

    if (pathname === "/") {
        if (!(token?.user)) {
            return NextResponse.next();
        }
        if (token.user.role === "STUDENT") {
            return NextResponse.redirect(absolute("/student"));
        }
        if (token.user.role === "STAFF") {
            return NextResponse.redirect(absolute("/staff"));
        }
        if (token.user.role === "ADMIN") {
            return NextResponse.redirect(absolute("/admin"));
        }
        if (token.user.role === "MANAGER") {
            return NextResponse.redirect(absolute("/manager"));
        }
    }

    // Handle public paths
    if (publicPaths.includes(pathname)) {
        return NextResponse.next();
    }

    // Handle auth routes
    if (pathname.startsWith('/auth')) {
        return token
            ? NextResponse.redirect(absolute("/student"))
            : NextResponse.next();
    }

    // Require authentication for all other routes
    if (!token?.user) {
        return NextResponse.redirect(absolute("/auth/login"));
    }


    for (const [route, role] of Object.entries(roleRoutes)) {
        if (pathname.startsWith(route) && token.user.role === role) {
            return NextResponse.next();
        }
    }

    // Default: redirect to home if no access
    return NextResponse.redirect(absolute("/"));
}

export const config = {
    matcher: [
        '/',
        '/auth/:path*',
        '/staff/:path*',
        '/admin/:path*',
        '/manager/:path*',
        '/student/:path*',
        '/ide',
        '/forum'
    ]
}