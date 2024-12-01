"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, FileText, Terminal, MessageSquare } from 'lucide-react'
import { cn } from "@/lib/utils"

const navItems = [
  {
    name: "Home",
    href: "/",
    icon: Home
  },
  {
    name: "Quiz",
    href: "/quiz",
    icon: BookOpen
  },
  {
    name: "Assignments",
    href: "/assignments",
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

export function MainNav() {
  const pathname = usePathname()

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

