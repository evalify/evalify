import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const publicPaths = ['/ide', "/", "/forum"];

const allowedIPs = [
    "172.17.191.",	"172.17.71.",
    "172.17.192.",	"172.17.72.",
    "172.17.193.",  "172.17.73.",
    "172.17.194.",	"172.17.74.",
    "172.17.195.",	"172.17.75.",
    "172.17.196.",	"172.17.76.",
    "172.17.77.",   "172.17.78."
]


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

    let ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] || 
    req.headers.get("cf-connecting-ip") || 
    req.headers.get("x-real-ip") || 
    req.headers.get("fastly-client-ip") || 
    req.headers.get("true-client-ip") || 
    req.headers.get("x-client-ip") ||
    req.headers.get("x-cluster-client-ip") ||
    req.headers.get("x-forward") ||
    req.headers.get("forwarded")?.split(";")[0].split("=")[1] || 
    req.socket?.remoteAddress ||
    "Unknown IP";
    ip = ip.replace(/^::ffff:/, '');


    let canStudentAcess = true;

    if (process.env.RESTRICT_MODE === "TRUE"){
        // set canStudentAcess to false if the IP doesnot starts with IPs in allowedIPs list
        canStudentAcess = allowedIPs.some((allowedIP) => ip.startsWith(allowedIP));
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
        if (token.user.role === "STUDENT" && !canStudentAcess) {
            return NextResponse.redirect(absolute("/error/unauthorizedStudentAccess"));
        }
        if (token.user.role === "STUDENT" && canStudentAcess) {
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