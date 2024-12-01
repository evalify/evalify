
import type { Metadata } from "next"
import { Providers } from "../components/providers"
import HeaderNavbar from "@/components/header-nav"

import { GeistSans } from "geist/font/sans"
import "./globals.css"

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
          <main className="flex-1 mt-14 overscroll-contain">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
