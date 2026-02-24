"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { trpc } from "@/lib/trpc/client";

export type ViewType = "list" | "grid";

interface ViewContextType {
    view: ViewType;
    setView: (view: ViewType) => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function ViewProvider({ children }: { children: React.ReactNode }) {
    const [view, setView] = useState<ViewType>("list");
    const { setTheme, theme } = useTheme();

    const { data: userData } = trpc.user.getMyProfile.useQuery();

    const initialized = React.useRef(false);

    useEffect(() => {
        if (userData && !initialized.current) {
            initialized.current = true;
            queueMicrotask(() => {
                if (userData.view && userData.view !== view) {
                    setView(userData.view as ViewType);
                }
                if (userData.theme && userData.theme !== theme) {
                    setTheme(userData.theme);
                }
            });
        }
    }, [userData, theme, view, setTheme]);

    return <ViewContext.Provider value={{ view, setView }}>{children}</ViewContext.Provider>;
}

export function useView() {
    const context = useContext(ViewContext);
    if (context === undefined) {
        throw new Error("useView must be used within a ViewProvider");
    }
    return context;
}
