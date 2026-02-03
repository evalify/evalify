import type { Metadata } from "next";
import AuthGuard from "@/components/auth/auth-guard";
import { UserType } from "@/lib/auth/utils";

export const metadata: Metadata = {
    title: "Admin Panel - Evalify",
    description: "Administrative panel for managing users, departments, and system settings",
};

/**
 * Admin layout with strict role-based access control
 * Only users with ADMIN role can access these pages
 */
export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <AuthGuard requiredGroups={[UserType.ADMIN]}>
            <div className="space-y-6">{children}</div>
        </AuthGuard>
    );
}
