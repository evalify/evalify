'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { ExclamationTriangleIcon } from "@radix-ui/react-icons"

export function LoginForm() {
    const router = useRouter()
    const [rollno, setRollno] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        try {
            const result = await signIn('credentials', {
                redirect: false,
                rollNo: rollno,
                password,
            })

            if (!result) {
                setError('Authentication service is unavailable')
                return
            }

            if (result.error === 'CredentialsSignin') {
                setError('Invalid username or password')
            } else if (result.ok) {
                // Get user data directly from credentials response
                const userResponse = await fetch(`/api/profile?rollNo=${rollno}`)
                const userData = await userResponse.json()
                
                if (userData.user) {
                    const createdAt = new Date(userData.user.createdAt).getTime()
                    const lastPasswordChange = new Date(userData.user.lastPasswordChange).getTime()
                    
                    if (createdAt === lastPasswordChange) {
                        router.push('/auth/change-password')
                    } else {
                        router.push('/')
                    }
                } else {
                    router.push('/')
                }
                router.refresh()
            } else {
                setError('An error occurred during login')
            }
        } catch (error) {
            setError('Unable to connect to the server')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="rollno" className="text-sm font-medium">
                        Username
                    </Label>
                    <Input
                        id="rollno"
                        type="text"
                        placeholder="Enter your username"
                        value={rollno}
                        onChange={(e) => setRollno(e.target.value)}
                        required
                        className="bg-background"
                        autoComplete="username"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                        Password
                    </Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-background"
                        autoComplete="current-password"
                    />
                </div>
            </div>

            {error && (
                <div className="rounded-md bg-red-800/15 p-3">
                    <div className="flex items-center gap-x-2 text-sm text-red-500">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        <p>{error}</p>
                    </div>
                </div>
            )}

            <Button
                type="submit"
                className="w-full font-semibold"
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                    </>
                ) : (
                    'Sign in'
                )}
            </Button>
        </form>
    )
}
