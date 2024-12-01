import { LoginForm } from "@/components/auth/login-form";


export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="bg-card text-card-foreground p-8 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center">Log In</h1>
                <LoginForm />
            </div>
        </div>
    )
}
