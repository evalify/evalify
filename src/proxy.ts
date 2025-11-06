import { NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
    req.headers.set("x-custom-header", "my-custom-value");
    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
