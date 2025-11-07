import AuthGuard from "@/components/auth/auth-guard";
import { UserType } from "@/lib/auth/utils";

export default function Page() {
    return (
        <AuthGuard requiredGroups={[UserType.MANAGER, UserType.STAFF]}>
            Question Bank Page
        </AuthGuard>
    );
}
