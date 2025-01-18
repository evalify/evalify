'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ChangePasswordPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [password, setPassword] = useState('')
    const [confirmNewPassword, setConfirmNewPassword] = useState('')
    const [oldPassword, setOldPassword] = useState('')  // Add this state

    const validatePassword = (password: string) => {
        if (password.length < 8) {
            return 'Password must be at least 8 characters long';
        }
        if (!/[A-Z]/.test(password)) {
            return 'Password must contain at least one uppercase letter';
        }
        if (!/[a-z]/.test(password)) {
            return 'Password must contain at least one lowercase letter';
        }
        if (!/[0-9]/.test(password)) {
            return 'Password must contain at least one number';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        const passwordError = validatePassword(password);
        if (passwordError) {
            toast({
                variant: "destructive",
                title: "Invalid Password",
                description: passwordError,
            });
            return;
        }

        if (password !== confirmNewPassword) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Passwords do not match",
            });
            return;
        }

        setLoading(true)
        try {
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: session?.user?.email,
                    oldPassword: oldPassword,  // Use actual old password
                    newPassword: password,
                }),
            })

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Password changed successfully",
                })
                router.push('/')
            } else {
                const data = await response.json()
                throw new Error(data.error || 'Failed to change password')
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to change password",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container max-w-md mx-auto py-16">
            <Card>
                <CardHeader>
                    <CardTitle>Change Password Required</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="oldPassword">Current Password</Label>
                            <Input
                                id="oldPassword"
                                type="password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                required
                                placeholder="Enter your current password"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="At least 8 characters"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                            <p>Password must contain:</p>
                            <ul className="list-disc pl-4">
                                <li>At least 8 characters</li>
                                <li>One uppercase letter</li>
                                <li>One lowercase letter</li>
                                <li>One number</li>
                            </ul>
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Changing Password...' : 'Change Password'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
