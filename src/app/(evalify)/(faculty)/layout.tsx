import AuthGuard from "@/components/auth/auth-guard";
import { UserType } from "@/lib/auth/utils";

/**
 * Faculty and Manager layout with strict role-based access control
 * Only users with MANAGER or STAFF role can access these pages
 */
export default function FacultyLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <AuthGuard requiredGroups={[UserType.MANAGER, UserType.STAFF]}>
            <div>{children}</div>
        </AuthGuard>
    );
}
