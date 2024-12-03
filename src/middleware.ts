
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';


export async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    const publicPath: string[] = [
        '/ide'
    ]

    if (publicPath.includes(pathname)) {
        return NextResponse.next();
    }

    if (pathname.startsWith('/auth')) {
        if (!token) {
            return NextResponse.next()
        } else {
            return NextResponse.redirect("/")
        }
    }

    if (pathname === '/') {
        if (token?.user?.role === 'STUDENT') {
            return NextResponse.redirect(new URL('/student', req.url));
        } else if (token?.user?.role === 'STAFF') {
            return NextResponse.redirect(new URL('/staff', req.url));
        } else if (token?.user?.role === 'ADMIN') {
            return NextResponse.redirect(new URL('/admin', req.url));
        } else{
            return NextResponse.redirect(new URL('/auth/login', req.url));
        }
    }


    if (pathname.startsWith('/admin')) {
        if (token?.user?.role === 'ADMIN') {
            return NextResponse.next();
        } else {
            return NextResponse.redirect(new URL('/auth/login', req.url));
        }
    }

    if (pathname.startsWith('/staff')) {
        if (token?.user?.role === 'STAFF') {
            return NextResponse.next();
        } else {
            return NextResponse.redirect(new URL('/auth/login', req.url));
        }
    }






    // if (pathname.startsWith('/auth') || pathname === '/') {
    //     if (token) {
    //         const redirectUrl = token?.user?.role === 'ADMIN' ? '/admin' : token?.user?.role === 'STAFF' ? '/staff': '' ;
    //         return NextResponse.redirect(new URL(redirectUrl, req.url));
    //     }
    //     return NextResponse.next();
    // }

}


export const config = {
    matcher: ["/auth/:path*", "/", "/staff/:path*", "/admin/:path*"]
}