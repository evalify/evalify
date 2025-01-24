'use client'

import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/hooks/use-toast"
import { Loader2, Search, RefreshCw } from "lucide-react"
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { createUserWithRole } from "@/lib/actions/user-actions";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface Staff {
    id: string
    user: {
        name: string
        email: string
        phoneNo: string | null
    }
    courses: {
        name: string
        code: string
    }[]
    rollNo?: string
}

export default function StaffPage() {
    const [staffs, setStaffs] = useState<Staff[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const { toast } = useToast()
    const [resetPasswordFor, setResetPasswordFor] = useState<string | null>(null)
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newStaff, setNewStaff] = useState({ name: '', email: '', rollNo: '' });

    const fetchStaffs = async (searchQuery: string = '') => {
        try {
            const response = await fetch(`/api/admin/staff?search=${searchQuery}`)
            const data = await response.json()
            if (response.ok) {
                setStaffs(data)
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: data.error
                })
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to fetch staff data"
            })
        } finally {
            setLoading(false)
        }
    }

    const handleResetPassword = async (email: string) => {
        setResetPasswordFor(null) // Close dialog first
        try {
            const response = await fetch('/api/admin/staff/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            
            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Password has been reset successfully"
                });
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to reset password"
            });
        }
    };

    const handleCreateStaff = async () => {
        try {
            await createUserWithRole({
                ...newStaff,
                role: 'STAFF'
            });
            setCreateDialogOpen(false);
            setNewStaff({ name: '', email: '', rollNo: '' });
            fetchStaffs(search);
            toast({
                title: "Success",
                description: "Staff member created successfully"
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to create staff member"
            });
        }
    };

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchStaffs(search)
        }, 300)

        return () => clearTimeout(debounce)
    }, [search])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">Staff Management</h1>
                    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>Create Staff</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Staff Member</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col gap-4">
                                <Input
                                    placeholder="Name"
                                    value={newStaff.name}
                                    onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                                />
                                <Input
                                    placeholder="Email"
                                    type="email"
                                    value={newStaff.email}
                                    onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                                />
                                <Input
                                    placeholder="Staff ID/Roll Number"
                                    value={newStaff.rollNo}
                                    onChange={(e) => setNewStaff(prev => ({ ...prev, rollNo: e.target.value }))}
                                />
                                <Button onClick={handleCreateStaff}>Create</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
                <div className="relative">
                    <Search className="absolute left-2 top-3 h-4 w-4 text-gray-400" />
                    <Input
                        className="pl-8"
                        placeholder="Search staff by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {staffs.map((staff) => (
                    <Card key={staff.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                            <Link href={`/profile?profile=${staff.user.email}`} className="hover:underline">
                                <h2 className="text-xl font-semibold mb-2">{staff.user.name}</h2>
                            </Link>
                            <p className="text-sm text-gray-600 mb-1">{staff.user.email}</p>
                            {staff.user.phoneNo && (
                                <p className="text-sm text-gray-600 mb-3">{staff.user.phoneNo}</p>
                            )}
                            <div className="border-t pt-2">
                                <h3 className="text-sm font-semibold mb-1">Courses Handling:</h3>
                                {staff.courses && staff.courses.length > 0 ? (
                                    <ul className="text-sm text-gray-600">
                                        {staff.courses.map((course,index) => (
                                            <li key={index} className="mb-1">
                                                {course.name} ({course.code})
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No courses assigned</p>
                                )}
                            </div>
                            <div className="border-t pt-2 mt-2">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => setResetPasswordFor(staff.user.email)}
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Reset Password
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <AlertDialog open={!!resetPasswordFor} onOpenChange={() => setResetPasswordFor(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset Password Confirmation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to reset this staff member's password? 
                            Their password will be reset to their email ID prefix followed by @123.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => resetPasswordFor && handleResetPassword(resetPasswordFor)}
                        >
                            Reset Password
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {staffs.length === 0 && !loading && (
                <div className="text-center text-gray-500 mt-8">
                    No staff members found
                </div>
            )}
        </div>
    )
}