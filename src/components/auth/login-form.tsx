'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function LoginForm() {
    const router = useRouter()
    const [rollno, setRollno] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        try {
            const result = await signIn('credentials', {
                redirect: false,
                rollNo: rollno,
                password,
            })

            if (result?.error) {
                setError('Invalid roll no or password')
            } else {
                router.push('/')
                router.refresh()
            }
        } catch (error) {
            setError('An unexpected error occurred')
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
            <div className="space-y-2">
                <Label htmlFor="rollno" className="text-foreground">Roll No</Label>
                <Input
                    id="rollno"
                    type="text"
                    placeholder="Enter your roll no"
                    value={rollno}
                    onChange={(e) => setRollno(e.target.value)}
                    required
                    className="bg-background text-foreground border-input"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-background text-foreground border-input"
                />
            </div>
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Log in
            </Button>
        </form>
    )
}
