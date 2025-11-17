import AuthGuard from "@/components/auth/auth-guard";
import { UserType } from "@/lib/auth/utils";

export default function ExamLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <AuthGuard requiredRoles={[UserType.STUDENT]}>
            <div className="space-y-6">{children}</div>
        </AuthGuard>
    );
}
