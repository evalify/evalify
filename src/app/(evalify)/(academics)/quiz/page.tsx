import AuthGuard from "@/components/auth/auth-guard";
import { UserType } from "@/lib/auth/utils";

export default function QuizPage() {
    return <AuthGuard requiredGroups={[UserType.MANAGER, UserType.STAFF]}>Quiz Page</AuthGuard>;
}
