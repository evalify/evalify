'use client'

import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/hooks/use-toast"
import { Loader2, Search } from "lucide-react"
import Link from 'next/link'

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
}

export default function StaffPage() {
    const [staffs, setStaffs] = useState<Staff[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const { toast } = useToast()

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
                <h1 className="text-2xl font-bold mb-4">Staff Management</h1>
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
                        </CardContent>
                    </Card>
                ))}
            </div>

            {staffs.length === 0 && !loading && (
                <div className="text-center text-gray-500 mt-8">
                    No staff members found
                </div>
            )}
        </div>
    )
}