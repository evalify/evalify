import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const publicPaths = ['/ide', "/","/forum"];

export async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname, origin } = req.nextUrl;

    // Create absolute URL helper
    const absolute = (path: string) => `${origin}${path}`;

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

    // Handle role-based routes
    const roleRoutes = {
        '/student': 'STUDENT',
        '/admin': 'ADMIN',
        '/staff': 'STAFF'
    };

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
        '/student/:path*',
        '/ide',
        '/forum'
    ]
}