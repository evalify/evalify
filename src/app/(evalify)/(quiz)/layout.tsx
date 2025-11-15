import AuthGuard from "@/components/auth/auth-guard";
import { UserType } from "@/lib/auth/utils";

export default function QuizLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <AuthGuard requiredGroups={[UserType.STUDENT]}>
            <div>{children}</div>
        </AuthGuard>
    );
}
