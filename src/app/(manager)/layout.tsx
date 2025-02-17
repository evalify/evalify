

import { MainNav } from "@/components/main-nav"


export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {

    return (
        <div className="flex flex-1">
            <MainNav />
            <main className="flex-1 ml-28 m-6">
                {children}
            </main>
        </div>
    )
}

