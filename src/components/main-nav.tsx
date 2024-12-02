"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, BookOpen, FileText, Terminal, MessageSquare, Users, GraduationCap, School, UserCog, LucideIcon } from 'lucide-react'
import { useSession } from "next-auth/react"

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const StudentnavItems: NavItem[] = [
  {
    name: "Home",
    href: "/student",
    icon: Home
  },
  {
    name: "Quiz",
    href: "/student/quiz",
    icon: BookOpen
  },
  {
    name: "Assignments",
    href: "/student/assignments",
    icon: FileText
  },
  {
    name: "IDE",
    href: "/ide",
    icon: Terminal
  },
  {
    name: "Forum",
    href: "/forum",
    icon: MessageSquare
  }
]

const StaffnavItems: NavItem[] = [
  {
    name: "Home",
    href: "/staff",
    icon: Home
  },
  {
    name: "Quiz",
    href: "/staff/quiz",
    icon: BookOpen
  },
  {
    name: "Assignments",
    href: "/staff/assignments",
    icon: FileText
  },
  {
    name: "IDE",
    href: "/ide",
    icon: Terminal
  },
  {
    name: "Forum",
    href: "/forum",
    icon: MessageSquare
  }
]

const AdminnavItems: NavItem[] = [
  {
    name: "Home",
    href: "/admin",
    icon: Home
  },
  {
    name: "Class",
    href: "/admin/class",
    icon: GraduationCap
  },
  {
    name: "Course",
    href: "/admin/course",
    icon: School
  },
  {
    name: "Staffs",
    href: "/admin/staffs",
    icon: UserCog
  },
  {
    name: "Students",
    href: "/admin/students",
    icon: Users
  }
]

type UserRole = 'STUDENT' | 'STAFF' | 'ADMIN';

const roleToNavItems: Record<UserRole, NavItem[]> = {
  'STUDENT': StudentnavItems,
  'STAFF': StaffnavItems,
  'ADMIN': AdminnavItems,
}

export function MainNav() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [navItems, setNavItems] = React.useState<NavItem[] | null>(null)

  React.useEffect(() => {
    const role = session?.user?.role as UserRole
    if (role && role in roleToNavItems) {
      setNavItems(roleToNavItems[role])
    }
  }, [session])

  if (status === "loading") {
    return (
      <div className="fixed top-14 left-0 flex h-[calc(100%-3.5rem)] w-[80px] flex-col z-20 bg-background border-r">
        <div className="flex flex-col items-center gap-2 mt-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-[70px] h-[70px] rounded-lg animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!navItems) return null

  return (
    <div className="fixed top-14 left-0 flex h-[calc(100%-3.5rem)] w-[80px] flex-col z-20 bg-background border-r">
      <nav className="flex flex-col items-center gap-2 mt-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-[70px] h-[70px] rounded-lg text-center transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

