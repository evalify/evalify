"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ImageUploadCropModal } from "@/components/settings/image-upload-crop-modal";
import { ConfirmationDialog } from "@/components/ui/custom-alert-dialog";
import {
    User,
    Bell,
    Palette,
    Monitor,
    Sun,
    Moon,
    Camera,
    Trash2,
    Loader2,
    Edit2,
    Check,
    X,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";

function capitalizeWord(text: string) {
    return text
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

export default function SettingsPage() {
    const { data: session } = useSession();
    const { theme, setTheme } = useTheme();
    const { success, error } = useToast();
    const { track } = useAnalytics();
    const [activeTab, setActiveTab] = useState("account");
    const [fontSize, setFontSize] = useState([16]);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState("");

    // Fetch user profile data
    const { data: userData, refetch: refetchUserData } = trpc.user.getMyProfile.useQuery();

    // Fetch profile image
    const { data: profileImageData, refetch: refetchProfileImage } =
        trpc.profileImage.getProfileImage.useQuery();

    // Mutations
    const getUploadUrlMutation = trpc.profileImage.getUploadUrl.useMutation();
    const confirmUploadMutation = trpc.profileImage.confirmUpload.useMutation();
    const deleteImageMutation = trpc.profileImage.deleteProfileImage.useMutation();
    const updateProfileMutation = trpc.user.updateMyProfile.useMutation();

    const profileImageUrl = profileImageData?.imageUrl || session?.user?.image || null;

    // Initialize phone number when userData is loaded
    useEffect(() => {
        if (userData?.phoneNumber) {
            setPhoneNumber(userData.phoneNumber);
        }
    }, [userData]);

    const handleThemeChange = (newTheme: string) => {
        setTheme(newTheme);
        track("theme_changed", { theme: newTheme });
    };

    const applyFontSize = (size: number[]) => {
        setFontSize(size);
        document.documentElement.style.setProperty("--base-font-size", `${size[0]}px`);
        track("font_size_changed", { fontSize: size[0] });
    };

    const handleImageCropped = async (croppedImage: Blob) => {
        try {
            // Get upload URL
            const { uploadUrl, key } = await getUploadUrlMutation.mutateAsync({
                fileType: croppedImage.type,
            });

            // Upload to MinIO using presigned URL
            const uploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                body: croppedImage,
                headers: {
                    "Content-Type": croppedImage.type,
                },
            });

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload image");
            }

            // Confirm upload and update user record
            await confirmUploadMutation.mutateAsync({ key });

            // Refetch profile image
            await refetchProfileImage();

            success("Profile picture updated successfully");
            track("profile_image_uploaded", { fileSize: croppedImage.size });
        } catch (err) {
            console.error("Error uploading image:", err);
            error("Failed to upload profile picture", {
                description: "Please try again later.",
            });
        }
    };

    const handleDeleteImage = async () => {
        setIsDeleting(true);
        try {
            await deleteImageMutation.mutateAsync();
            await refetchProfileImage();
            success("Profile picture removed successfully");
            track("profile_image_deleted");
        } catch (err) {
            console.error("Error deleting image:", err);
            error("Failed to remove profile picture", {
                description: "Please try again later.",
            });
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    };

    const handleUpdatePhoneNumber = async () => {
        try {
            await updateProfileMutation.mutateAsync({
                phoneNumber: phoneNumber || undefined,
            });
            await refetchUserData();
            setIsEditingPhone(false);
            success("Phone number updated successfully");
            track("phone_number_updated");
        } catch (err) {
            console.error("Error updating phone number:", err);
            error("Failed to update phone number", {
                description: "Please try again later.",
            });
        }
    };

    const handleCancelPhoneEdit = () => {
        setPhoneNumber(userData?.phoneNumber || "");
        setIsEditingPhone(false);
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <div className="container mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                        Settings
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Manage your account preferences
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Left Sidebar - User Profile Card */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 pt-10 pb-10">
                            <CardContent className="p-6">
                                <div className="text-center space-y-4">
                                    <div className="relative inline-block group">
                                        <Avatar className="h-28 w-28 mx-auto ring-4 ring-primary/20">
                                            <AvatarImage src={profileImageUrl || undefined} />
                                            <AvatarFallback className="text-3xl font-semibold bg-linear-to-br from-primary to-primary/80 text-white dark:text-slate-900">
                                                {session?.user?.name?.slice(0, 2).toUpperCase() ||
                                                    "US"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <Badge className="absolute -bottom-1 -right-1 bg-primary border-0">
                                            {session?.user?.groups?.[0]?.toUpperCase() || "User"}
                                        </Badge>

                                        {/* Camera overlay on hover */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                className="rounded-full shadow-lg"
                                                onClick={() => setIsUploadModalOpen(true)}
                                            >
                                                <Camera className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                                            {capitalizeWord(session?.user?.name || "User Name")}
                                        </h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            {session?.user?.email || "user@example.com"}
                                        </p>
                                    </div>

                                    {/* Profile Image Actions */}
                                    <div className="flex gap-2 justify-center pt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsUploadModalOpen(true)}
                                            className="flex-1"
                                        >
                                            <Camera className="h-4 w-4 mr-2" />
                                            Upload
                                        </Button>
                                        {profileImageUrl && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsDeleteDialogOpen(true)}
                                                disabled={isDeleting}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                {isDeleting ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                            {/* Tab Navigation */}
                            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 p-2">
                                <TabsList className="grid w-full grid-cols-3 bg-transparent gap-2">
                                    <TabsTrigger
                                        value="account"
                                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700"
                                    >
                                        <User className="h-4 w-4 mr-2" />
                                        Account
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="appearance"
                                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700"
                                    >
                                        <Palette className="h-4 w-4 mr-2" />
                                        Appearance
                                    </TabsTrigger>
                                    <TabsTrigger
                                        disabled={true}
                                        value="notifications"
                                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700"
                                    >
                                        <Bell className="h-4 w-4 mr-2" />
                                        Notifications
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {/* Account Tab */}
                            <TabsContent value="account" className="space-y-6">
                                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="flex items-center gap-2">
                                            <User className="h-5 w-5 text-primary" />
                                            Personal Information
                                        </CardTitle>
                                        <CardDescription>
                                            Update your personal details and preferences
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="name">Full Name</Label>
                                                <Input
                                                    id="name"
                                                    disabled={true}
                                                    placeholder="Enter your full name"
                                                    defaultValue={capitalizeWord(
                                                        userData?.name || session?.user?.name || ""
                                                    )}
                                                    className="bg-white dark:bg-slate-900"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email Address</Label>
                                                <Input
                                                    disabled={true}
                                                    id="email"
                                                    type="email"
                                                    placeholder="Enter your email"
                                                    defaultValue={
                                                        userData?.email ||
                                                        session?.user?.email ||
                                                        ""
                                                    }
                                                    className="bg-white dark:bg-slate-900"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="profileId">Profile ID</Label>
                                                <Input
                                                    disabled={true}
                                                    id="profileId"
                                                    placeholder="Profile ID"
                                                    defaultValue={userData?.profileId || ""}
                                                    className="bg-white dark:bg-slate-900"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="phone">Phone Number</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        disabled={!isEditingPhone}
                                                        id="phone"
                                                        type="tel"
                                                        placeholder="Enter phone number"
                                                        value={phoneNumber || ""}
                                                        onChange={(e) =>
                                                            setPhoneNumber(e.target.value)
                                                        }
                                                        className="bg-white dark:bg-slate-900"
                                                    />
                                                    {!isEditingPhone ? (
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => setIsEditingPhone(true)}
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={handleUpdatePhoneNumber}
                                                                disabled={
                                                                    updateProfileMutation.isPending
                                                                }
                                                            >
                                                                {updateProfileMutation.isPending ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Check className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={handleCancelPhoneEdit}
                                                                disabled={
                                                                    updateProfileMutation.isPending
                                                                }
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold mt-6 mb-3">
                                                User Roles
                                            </h3>
                                            {session?.user.roles && (
                                                <div className="flex flex-wrap gap-2">
                                                    {session.user.roles.map((role, index) => (
                                                        <Badge key={index} variant="secondary">
                                                            {role}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Appearance Tab */}
                            <TabsContent value="appearance" className="space-y-6">
                                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Palette className="h-5 w-5 text-primary" />
                                            Theme & Display
                                        </CardTitle>
                                        <CardDescription>
                                            Customize your interface appearance
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-4">
                                            <Label>Theme Mode</Label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {["light", "dark", "system"].map((themeOption) => (
                                                    <div
                                                        key={themeOption}
                                                        className={`relative cursor-pointer rounded-lg border-2 p-3 ${
                                                            theme === themeOption
                                                                ? "border-primary bg-primary/5"
                                                                : "border-slate-200 dark:border-slate-700"
                                                        }`}
                                                        onClick={() =>
                                                            handleThemeChange(themeOption)
                                                        }
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {themeOption === "light" && (
                                                                <Sun className="h-4 w-4" />
                                                            )}
                                                            {themeOption === "dark" && (
                                                                <Moon className="h-4 w-4" />
                                                            )}
                                                            {themeOption === "system" && (
                                                                <Monitor className="h-4 w-4" />
                                                            )}
                                                            <span className="capitalize text-sm font-medium">
                                                                {themeOption}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <Label>Font Size: {fontSize[0]}px</Label>
                                            <Slider
                                                value={fontSize}
                                                onValueChange={applyFontSize}
                                                max={24}
                                                min={12}
                                                step={1}
                                                className="w-full"
                                            />
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>Small (12px)</span>
                                                <span>Large (24px)</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Notifications Tab */}
                            <TabsContent value="notifications" className="space-y-6">
                                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Bell className="h-5 w-5 text-primary" />
                                            Notification Preferences
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {[
                                            {
                                                title: "Exam Reminders",
                                                desc: "Get notified about upcoming exams",
                                                default: true,
                                            },
                                            {
                                                title: "Score Updates",
                                                desc: "Receive notifications when results are available",
                                                default: true,
                                            },
                                            {
                                                title: "Assignment Deadlines",
                                                desc: "Reminders for assignment due dates",
                                                default: true,
                                            },
                                            {
                                                title: "System Announcements",
                                                desc: "Important platform updates and news",
                                                default: false,
                                            },
                                        ].map((item, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between"
                                            >
                                                <div className="space-y-1">
                                                    <Label>{item.title}</Label>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                                        {item.desc}
                                                    </p>
                                                </div>
                                                <Switch defaultChecked={item.default} />
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                {/* Image Upload Modal */}
                <ImageUploadCropModal
                    open={isUploadModalOpen}
                    onOpenChange={setIsUploadModalOpen}
                    onImageCropped={handleImageCropped}
                />

                {/* Delete Image Confirmation Dialog */}
                <ConfirmationDialog
                    title="Delete Profile Picture"
                    message="Are you sure you want to delete your profile picture? This action cannot be undone."
                    confirmButtonText="Delete"
                    cancelButtonText="Cancel"
                    onAccept={handleDeleteImage}
                    isOpen={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                />
            </div>
        </div>
    );
}
