import AuthGuard from "@/components/auth/auth-guard";
import { UserType } from "@/lib/auth/utils";

type Props = {
    params: { bankId: string };
};

export default function Page({ params }: Props) {
    return (
        <AuthGuard requiredGroups={[UserType.MANAGER, UserType.STAFF]}>
            Question Bank Page - {params.bankId}
        </AuthGuard>
    );
}
