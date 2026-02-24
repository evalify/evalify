"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    BookOpen,
    Calendar,
    GraduationCap,
    LayoutDashboard,
    Settings,
    Users,
    Moon,
    Sun,
    LogOut,
    LogIn,
    BookMarked,
    PenTool,
    Building2,
    Beaker,
    ArrowLeft,
    ArrowRight,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useSession, signOut, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AuthGuard from "@/components/auth/auth-guard";
import { UserType } from "@/lib/auth/utils";

const mainNavItems = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        color: "text-blue-500",
    },
];

const academicsItems = [
    {
        title: "Courses",
        url: "/course",
        icon: BookMarked,
        color: "text-emerald-500",
    },
    {
        title: "Question Bank",
        url: "/question-bank",
        icon: BookOpen,
        color: "text-orange-500",
    },
];

const administrationItems = [
    {
        title: "Users",
        url: "/admin/user",
        icon: Users,
        color: "text-purple-500",
    },
    {
        title: "Batches",
        url: "/admin/batch",
        icon: GraduationCap,
        color: "text-indigo-500",
    },
    {
        title: "Semester",
        url: "/admin/semester",
        icon: Calendar,
        color: "text-rose-500",
    },
    {
        title: "Departments",
        url: "/admin/department",
        icon: Building2,
        color: "text-cyan-500",
    },
    {
        title: "Labs",
        url: "/admin/lab",
        icon: Beaker,
        color: "text-teal-500",
    },
];

const studentNavItems = [
    {
        title: "Courses",
        url: "/course",
        icon: BookMarked,
        color: "text-emerald-500",
    },
    {
        title: "Quiz",
        url: "/student/quiz",
        icon: PenTool,
        color: "text-amber-500",
    },
];

function capitalizeWord(word: string) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function ThemeDropdownItem({ mounted }: { mounted: boolean }) {
    const { setTheme, resolvedTheme } = useTheme();
    const isDark = mounted ? resolvedTheme === "dark" : false;

    return (
        <DropdownMenuItem
            onClick={(e) => {
                e.preventDefault();
                setTheme(isDark ? "light" : "dark");
            }}
            className="cursor-pointer w-full flex items-center justify-between"
            disabled={!mounted}
        >
            <div className="flex items-center">
                {mounted && isDark ? (
                    <Sun className="mr-4 h-4 w-4 text-yellow-500" />
                ) : (
                    <Moon className="mr-4 h-4 w-4 text-indigo-500" />
                )}
                <span>Theme</span>
            </div>
            <span className="text-xs text-muted-foreground">
                {mounted ? (isDark ? "Light" : "Dark") : "Theme"}
            </span>
        </DropdownMenuItem>
    );
}

export function AppSidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { open } = useSidebar();
    const [mounted, setMounted] = useState(false);

    // This is a valid use case for detecting client-side mounting to prevent hydration mismatches
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    return (
        <Sidebar collapsible="icon" side="left" className="group relative">
            <SidebarHeader className="border-b border-sidebar-border bg-linear-to-br from-sidebar/40 via-sidebar/60 to-sidebar/80 dark:from-sidebar/60 dark:via-sidebar/80 dark:to-sidebar backdrop-blur-sm p-0">
                <Link href="/" className="block">
                    <div className="flex items-center p-2 min-h-16 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-3">
                        {/* <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-lg ring-2 ring-primary/20 transition-all duration-200 hover:scale-105 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 p-1.5"> */}
                        <Image
                            src="/logo.svg"
                            alt="Evalify Logo"
                            width={40}
                            height={40}
                            className="object-contain dark:invert"
                            priority
                            color="green"
                        />
                        {/* </div> */}
                        <div className="ml-3 flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                            <span className="font-bold text-xl bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent truncate">
                                Evalify
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                                Assessment Platform
                            </span>
                        </div>
                    </div>
                </Link>
            </SidebarHeader>

            {/* Sidebar Toggle Button - Positioned for left sidebar */}
            <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-20 hidden md:block">
                <SidebarTrigger className="h-6 w-6 rounded-md bg-sidebar-border/50 hover:bg-sidebar-border text-sidebar-foreground border border-sidebar-border/30 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-1 focus:ring-primary/30">
                    {open ? <ArrowLeft className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                </SidebarTrigger>
            </div>

            <SidebarContent className="bg-linear-to-b from-sidebar via-sidebar/50 to-sidebar dark:from-sidebar dark:via-sidebar/80 dark:to-sidebar scrollbar-thin scrollbar-track-transparent scrollbar-thumb-sidebar-border/50 hover:scrollbar-thumb-sidebar-border overflow-x-hidden p-0">
                <SidebarGroup className="px-2 py-4">
                    <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70 px-2 group-data-[collapsible=icon]:sr-only">
                        Main
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {mainNavItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === item.url}
                                        tooltip={item.title}
                                        className="group/item transition-all duration-200 hover:bg-sidebar-accent/80"
                                    >
                                        <Link href={item.url} className="flex items-center">
                                            <item.icon
                                                className={`h-4 w-4 transition-colors ${
                                                    pathname === item.url
                                                        ? "text-sidebar-accent-foreground"
                                                        : `${item.color} group-hover/item:text-sidebar-accent-foreground`
                                                }`}
                                            />
                                            <span className="font-medium">{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator className="bg-linear-to-r from-transparent via-sidebar-border to-transparent mx-2" />

                <AuthGuard
                    requiredGroups={[UserType.STAFF, UserType.MANAGER]}
                    fallbackComponent={null}
                >
                    <SidebarGroup className="px-2 py-4">
                        <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70 px-2 group-data-[collapsible=icon]:sr-only">
                            Academics
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {academicsItems.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname === item.url}
                                            tooltip={item.title}
                                            className="group/item transition-all duration-200 hover:bg-sidebar-accent/80"
                                        >
                                            <Link href={item.url} className="flex items-center">
                                                <item.icon
                                                    className={`h-4 w-4 transition-colors ${
                                                        pathname === item.url
                                                            ? "text-sidebar-accent-foreground"
                                                            : `${item.color} group-hover/item:text-sidebar-accent-foreground`
                                                    }`}
                                                />
                                                <span className="font-medium">{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                    <SidebarSeparator className="bg-linear-to-r from-transparent via-sidebar-border to-transparent mx-2" />
                </AuthGuard>

                <AuthGuard requiredGroups={[UserType.ADMIN]} fallbackComponent={null}>
                    <SidebarGroup className="px-2 py-4">
                        <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70 px-2 group-data-[collapsible=icon]:sr-only">
                            Administration
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {administrationItems.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname === item.url}
                                            tooltip={item.title}
                                            className="group/item transition-all duration-200 hover:bg-sidebar-accent/80"
                                        >
                                            <Link href={item.url} className="flex items-center">
                                                <item.icon
                                                    className={`h-4 w-4 transition-colors ${
                                                        pathname === item.url
                                                            ? "text-sidebar-accent-foreground"
                                                            : `${item.color} group-hover/item:text-sidebar-accent-foreground`
                                                    }`}
                                                />
                                                <span className="font-medium">{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                    <SidebarSeparator className="bg-linear-to-r from-transparent via-sidebar-border to-transparent mx-2" />
                </AuthGuard>

                <AuthGuard requiredGroups={[UserType.STUDENT]} fallbackComponent={null}>
                    <SidebarGroup className="px-2 py-4">
                        <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70 px-2 group-data-[collapsible=icon]:sr-only">
                            Student
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {studentNavItems.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname === item.url}
                                            tooltip={item.title}
                                            className="group/item transition-all duration-200 hover:bg-sidebar-accent/80"
                                        >
                                            <Link href={item.url} className="flex items-center">
                                                <item.icon
                                                    className={`h-4 w-4 transition-colors ${
                                                        pathname === item.url
                                                            ? "text-sidebar-accent-foreground"
                                                            : `${item.color} group-hover/item:text-sidebar-accent-foreground`
                                                    }`}
                                                />
                                                <span className="font-medium">{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                    <SidebarSeparator className="bg-linear-to-r from-transparent via-sidebar-border to-transparent mx-2" />
                </AuthGuard>
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border bg-linear-to-r from-sidebar via-sidebar/80 to-sidebar backdrop-blur-sm p-2 overflow-hidden">
                <SidebarMenu className="overflow-hidden">
                    {mounted && session?.user ? (
                        <SidebarMenuItem>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="group w-full overflow-hidden cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 rounded-lg"
                                    >
                                        <div className="flex items-center p-2 rounded-lg hover:bg-sidebar-accent/50 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-3">
                                            <Avatar className="h-8 w-8 shrink-0 rounded-lg ring-2 ring-primary/20 transition-all duration-200 hover:ring-primary/40 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
                                                <AvatarImage
                                                    src={session.user.image || ""}
                                                    alt={session.user.name || ""}
                                                    className="object-cover"
                                                />
                                                <AvatarFallback className="rounded-lg bg-linear-to-br from-primary to-primary/80 text-primary-foreground text-sm font-semibold group-data-[collapsible=icon]:text-xs">
                                                    {session.user.name?.slice(0, 2).toUpperCase() ||
                                                        "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="ml-3 flex items-center justify-between flex-1 min-w-0 group-data-[collapsible=icon]:hidden overflow-hidden">
                                                <div className="flex-1 min-w-0 overflow-hidden">
                                                    <div className="font-semibold text-sm truncate">
                                                        {capitalizeWord(session.user.name || "")}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate">
                                                        {session.user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    side="top"
                                    className="w-60 mb-2"
                                    align="end"
                                    sideOffset={8}
                                >
                                    <DropdownMenuItem asChild>
                                        <Link
                                            href="/settings"
                                            className="cursor-pointer w-full flex items-center"
                                        >
                                            <Settings className="mr-2 h-4 w-4" />
                                            <span>Settings</span>
                                        </Link>
                                    </DropdownMenuItem>

                                    <ThemeDropdownItem mounted={mounted} />
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => signOut({ callbackUrl: "/" })}
                                        className="cursor-pointer text-red-600 focus:text-red-700 dark:text-red-500 dark:focus:text-red-400"
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Log out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </SidebarMenuItem>
                    ) : mounted ? (
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => signIn("keycloak")}
                                tooltip="Sign in to access all features"
                                className="w-full justify-center bg-linear-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 transition-all duration-200 hover:scale-105 group-data-[collapsible=icon]:p-3"
                            >
                                <LogIn className="h-4 w-4 text-green-400 group-data-[collapsible=icon]:h-5 group-data-[collapsible=icon]:w-5" />
                                <span className="font-medium group-data-[collapsible=icon]:hidden">
                                    Sign In
                                </span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ) : (
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip="Loading..."
                                disabled
                                className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-3"
                            >
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent shrink-0" />
                                <span className="group-data-[collapsible=icon]:hidden">
                                    Loading...
                                </span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
