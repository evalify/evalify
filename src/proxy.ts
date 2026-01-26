import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

export default auth((req) => {
    const { pathname } = req.nextUrl;
    const isExternalAPIProtected = process.env.PROTECTED
        ? !(process.env.PROTECTED === "false")
        : true;

    if (
        pathname.startsWith("/api/utils") &&
        isExternalAPIProtected &&
        req.headers.get("API_KEY") !== process.env.API_KEY
    ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!_next/static|_next/image|.*\\.png$).*)", "/api/eval/:path*"],
};
