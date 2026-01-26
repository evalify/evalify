"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";
import { TRPCProvider } from "@/lib/trpc/client";
import { Toaster } from "sonner";
import { ModalManagerProvider } from "@/contexts/modal-manager-context";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export interface ProvidersProps {
    children: React.ReactNode;
    theme?: ThemeProviderProps;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
        >
            <SessionProvider>
                <TRPCProvider>
                    <ModalManagerProvider>
                        {children}
                        <Toaster position="bottom-right" richColors expand={true} />
                    </ModalManagerProvider>
                    {process.env.NODE_ENV === "development" && (
                        <ReactQueryDevtools initialIsOpen={false} />
                    )}
                </TRPCProvider>
            </SessionProvider>
        </NextThemesProvider>
    );
}
