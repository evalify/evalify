import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
    return (
        <div className="min-h-screen grid place-items-center bg-background p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
                    <p className="text-muted-foreground">Enter your credentials to access your account</p>
                </div>
                <div className="border bg-card text-card-foreground rounded-lg shadow-sm">
                    <LoginForm />
                </div>
            </div>
        </div>
    )
}
