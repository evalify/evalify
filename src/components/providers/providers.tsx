"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";
import { TRPCProvider } from "@/lib/trpc/client";

export interface ProvidersProps {
    children: React.ReactNode;
    theme?: ThemeProviderProps;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <SessionProvider>
                <TRPCProvider>{children}</TRPCProvider>
            </SessionProvider>
        </NextThemesProvider>
    );
}
