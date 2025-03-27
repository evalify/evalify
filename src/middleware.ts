import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import "server-only";

const publicPaths = ["/ide", "/", "/forum"];

const allowedIPs = [
    "172.17.191.",
    "172.17.71.",
    "172.17.192.",
    "172.17.72.",
    "172.17.193.",
    "172.17.73.",
    "172.17.194.",
    "172.17.74.",
    "172.17.195.",
    "172.17.75.",
    "172.17.196.",
    "172.17.76.",
    "172.17.77.",
    "172.17.78.",
];

export async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname, origin,searchParams } = req.nextUrl;

    // Skip processing for /api/log to prevent circular requests
    if (pathname === "/api/log") {
        return NextResponse.next();
    }

    const absolute = (path: string) => `${origin}${path}`;

    // Allow access to change-password page even when authenticated
    if (pathname === "/auth/change-password") {
        return NextResponse.next();
    }

    if (pathname.startsWith("/quiz") && token?.user?.role === "STUDENT") {
        return NextResponse.next();
    }

    let ip = req.headers.get("x-forwarded-for")?.split(",")[0] ||
        req.headers.get("cf-connecting-ip") ||
        req.headers.get("x-real-ip") ||
        req.headers.get("fastly-client-ip") ||
        req.headers.get("true-client-ip") ||
        req.headers.get("x-client-ip") ||
        req.headers.get("x-cluster-client-ip") ||
        req.headers.get("x-forward") ||
        req.headers.get("forwarded")?.split(";")[0]?.split("=")[1] ||
        req.socket?.remoteAddress ||
        "Unknown IP";

    // Ensure ip is a string before trying to replace
    ip = typeof ip === "string" ? ip.replace(/^::ffff:/, "") : "Unknown IP";

    const logData = {
        user: token?.user.rollNo || null,
        name: token?.user.name || null,
        ip: ip,
        pathname: pathname,
        timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
        searchParams: Object.fromEntries(searchParams.entries()),
        method: req.method,
        userAgent: req.headers.get("user-agent") || "Unknown Browser",
        referer: req.headers.get("referer") || "Unknown Referrer",
        status: token?.user ? "Authenticated" : "Unauthenticated",
    };

    try {
        // Use absolute URL instead of relative path
        const response = await fetch(`${req.nextUrl.origin}/api/log`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token?.accessToken ? { "Authorization": `Bearer ${token.accessToken}` } : {})
            },
            body: JSON.stringify({ logData }),
        });
        
        if (!response.ok) {
            console.error('Failed to log request:', response.status);
        }
    } catch (error) {
        // Silent fail to prevent middleware from breaking
        console.error('Error logging request:', error);
    }

    if (pathname.startsWith("/api")) {
        return NextResponse.next();
    }

    let canStudentAcess = true;

    if (process.env.RESTRICT_MODE === "TRUE" && typeof ip === "string") {
        canStudentAcess = allowedIPs.some((allowedIP) =>
            ip.startsWith(allowedIP)
        );
    }

    // Handle role-based routes
    const roleRoutes = {
        "/student": "STUDENT",
        "/admin": "ADMIN",
        "/staff": "STAFF",
        "/manager": "MANAGER",
    };

    if (pathname === "/") {
        if (!(token?.user)) {
            return NextResponse.next();
        }
        const role = token.user.role;
        if (role === "STUDENT") {
            return NextResponse.redirect(absolute("/student"));
        }
        if (role === "STAFF") {
            return NextResponse.redirect(absolute("/staff"));
        }
        if (role === "ADMIN") {
            return NextResponse.redirect(absolute("/admin"));
        }
        if (role === "MANAGER") {
            return NextResponse.redirect(absolute("/manager"));
        }
    }

    // Handle public paths
    if (publicPaths.includes(pathname)) {
        return NextResponse.next();
    }

    // Handle auth routes
    if (pathname.startsWith("/auth")) {
        return token
            ? NextResponse.redirect(absolute("/student"))
            : NextResponse.next();
    }

    // Require authentication for all other routes
    if (!token?.user) {
        return NextResponse.redirect(absolute("/auth/login"));
    }

    // Check for unauthorized student access
    if (
        pathname.startsWith("/student") && token.user.role === "STUDENT" &&
        !canStudentAcess
    ) {
        return NextResponse.redirect(
            absolute("/error/unauthorizedStudentAccess"),
        );
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
        "/",
        "/auth/:path*",
        "/staff/:path*",
        "/admin/:path*",
        "/manager/:path*",
        "/student/:path*",
        "/api/:path*",
        "/quiz/:path*",
        "/error/:path*",
    ],
};
