import type { Metadata } from "next"
import { Providers } from "../components/providers"
import HeaderNavbar from "@/components/header-nav"

import { GeistSans } from "geist/font/sans"
import "./globals.css"
import 'katex/dist/katex.min.css'
import { Toaster as T } from 'sonner';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "Evalify",
  description: "AUMS Killer",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.className} flex min-h-screen `}>
        <Providers>
          <HeaderNavbar />
          <main className="flex-1 mt-14 h-[94vh] overscroll-contain">
            {children}
            <T />
            <Toaster />
          </main>
        </Providers>
      </body>
    </html>
  )
}
