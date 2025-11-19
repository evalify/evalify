import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

export default auth((req) => {
    const { pathname } = req.nextUrl;

    if (
        pathname.startsWith("/api/utils") &&
        req.headers.get("API_KEY") !== process.env.EVALUATION_SERVICE_API_KEY
    ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!_next/static|_next/image|.*\\.png$).*)", "/api/eval/:path*"],
};
