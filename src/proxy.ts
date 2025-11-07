export { auth as proxy } from "@/lib/auth/auth";

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
