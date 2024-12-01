
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';


// donot allow logined user to access /auth/login
export async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    const ip =
        req.ip ||
        req.headers.get('x-forwarded-for')?.split(',')[0] || 
        req.headers.get('x-real-ip') || 
        req.socket?.remoteAddress ||
        'Unknown IP';

    // console.log(`Request from IP: ${ip} for ${pathname} from ${token?.rollno}`);

    if (!token && !pathname.startsWith('/auth')) {
        return NextResponse.redirect(new URL('/auth/login', req.url));
    }


    if (pathname.startsWith('/auth') || pathname.startsWith('/dashboard')) {
        if (token) {
            const redirectUrl = token.role === 'ADMIN' ? '/admin' : token.role === 'STAFF' ? '/staff' : '/';
            return NextResponse.redirect(new URL(redirectUrl, req.url));
        }

        // If user is not authenticated, allow them to access /auth/login or /auth/register
        return NextResponse.next();
    }
}


export const config = {
    matcher: ["/auth/:path*", "/"],
}


