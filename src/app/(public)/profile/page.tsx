'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pencil, User, Upload, ArrowLeft } from 'lucide-react'
import { useToast } from "@/components/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import ImageCropper from './_components/image-cropper'
import { useRouter } from 'next/navigation'


interface UserData {
    name: string
    phoneNo: string
    rollNo: string
    image: string
    email: string
    role: string
    lastPasswordChange: string
}



export default function UserProfilePage() {
    const { data: session } = useSession()
    const { toast } = useToast()


    // get an optional search query
    const search = new URLSearchParams(window.location.search).get('profile')
    const router = useRouter()

    const [isEditing, setIsEditing] = useState(false)
    const [user, setUser] = useState<UserData | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        phoneNo: '',
        image: '',
    })
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
    })
    const [showCropper, setShowCropper] = useState(false)
    const [cropImage, setCropImage] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const fetchUser = async () => {
            if (!session?.user?.email) return

            try {
                const response = await fetch(`/api/profile?email=${search || session.user.email}`)
                const data = await response.json()
                if (response.ok) {
                    setUser(data.user)
                    setFormData({
                        name: data.user.name || '',
                        phoneNo: data.user.phoneNo || '',
                        image: data.user.image || '',
                    })
                } else {
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: data.error,
                    })
                }
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to fetch user data",
                })
            }
        }

        fetchUser()
    }, [session, toast])

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData({ ...formData, [name]: value })
    }

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setPasswordData({ ...passwordData, [name]: value })
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader()
            reader.onload = (e) => {
                if (e.target?.result) {
                    setCropImage(e.target.result as string)
                    setShowCropper(true)
                }
            }
            reader.readAsDataURL(e.target.files[0])
        }
    }

    const handleCroppedImage = async (croppedImage: Blob) => {
        if (!session?.user?.email) return

        const formData = new FormData()
        formData.append('file', croppedImage, 'profile.jpg')
        formData.append('email', session.user.email)

        try {
            const response = await fetch('/api/profile/upload', {
                method: 'POST',
                body: formData,
            })
            const data = await response.json()

            if (response.ok) {
                setFormData(prev => ({ ...prev, image: data.url }))
                setUser(prev => prev ? { ...prev, image: data.url } : null)
                toast({
                    title: "Success",
                    description: "Profile image updated successfully",
                })
            } else {
                throw new Error(data.error)
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to upload image",
            })
        }
        setShowCropper(false)
    }

    const updateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!session?.user?.email) return

        try {
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: session.user.email, ...formData }),
            })
            const data = await response.json()

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Profile updated successfully",
                })
                setIsEditing(false)
                setUser({ ...user!, ...formData })
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: data.error,
                })
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update profile",
            })
        }
    }

    const changePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!session?.user?.email) return

        try {
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: session.user.email, ...passwordData }),
            })
            const data = await response.json()

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Password changed successfully",
                })
                setPasswordData({ oldPassword: '', newPassword: '' })
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: data.error,
                })
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to change password",
            })
        }
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-lg">Loading...</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-3xl font-bold">Profile Page</h1>
                </div>
                <Button
                    variant="outline"
                    onClick={() => setIsEditing(!isEditing)}
                >
                    <Pencil className="h-4 w-4 mr-2" />
                    {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                </Button>
            </div>

            <div className="grid lg:grid-cols-[1fr_2fr] gap-8">
                {/* Profile Image and Name Section */}
                <div className="space-y-4">
                    <div className="aspect-square relative rounded-lg overflow-hidden border-2 border-muted">
                        {formData.image ? (
                            <>
                                <Image
                                    src={formData.image}
                                    alt={formData.name}
                                    fill
                                    className="object-cover"
                                />
                                {isEditing && (
                                    <label htmlFor="imageUpload" className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer">
                                        <Upload className="h-8 w-8 text-white" />
                                        <input
                                            id="imageUpload"
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageSelect}
                                            ref={fileInputRef}
                                        />
                                    </label>
                                )}
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                                <User className="h-32 w-32 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold">{formData.name}</h2>
                        <p className="text-muted-foreground">{user.role}</p>
                    </div>
                </div>

                {/* User Details Section */}
                <Card className="w-full">
                    <CardContent className="p-6">
                        <Tabs defaultValue="details">
                            <TabsList className="mb-4">
                                <TabsTrigger value="details">User Details</TabsTrigger>
                                <TabsTrigger value="security">Security</TabsTrigger>
                            </TabsList>

                            <TabsContent value="details">
                                <form onSubmit={updateProfile} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleProfileChange}
                                            disabled={!isEditing}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            value={user.email}
                                            disabled
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phoneNo">Phone Number</Label>
                                        <Input
                                            id="phoneNo"
                                            name="phoneNo"
                                            value={formData.phoneNo}
                                            onChange={handleProfileChange}
                                            disabled={!isEditing}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="rollNo">Roll Number</Label>
                                        <Input
                                            id="rollNo"
                                            value={user.rollNo}
                                            disabled
                                        />
                                    </div>
                                    {isEditing && (
                                        <Button type="submit" className="w-full">
                                            Save Changes
                                        </Button>
                                    )}
                                </form>
                            </TabsContent>

                            <TabsContent value="security">
                                <form onSubmit={changePassword} className="space-y-4">
                                    <div className='font-light text-gray-600'>
                                        Last password change: {
                                            new Date(user.lastPasswordChange).toLocaleString('en-US', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                            })
                                        }
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="oldPassword">Current Password</Label>
                                        <Input
                                            id="oldPassword"
                                            name="oldPassword"
                                            type="password"
                                            value={passwordData.oldPassword}
                                            onChange={handlePasswordChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="newPassword">New Password</Label>
                                        <Input
                                            id="newPassword"
                                            name="newPassword"
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={handlePasswordChange}
                                        />
                                    </div>
                                    <Button type="submit" className="w-full">
                                        Change Password
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
            {showCropper && cropImage && (
                <ImageCropper
                    image={cropImage}
                    onCropComplete={handleCroppedImage}
                    onCancel={() => setShowCropper(false)}
                />
            )}
            <Toaster />
        </div>
    )
}
