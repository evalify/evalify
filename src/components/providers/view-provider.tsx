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
    const { setTheme } = useTheme();

    const { data: userData } = trpc.user.getMyProfile.useQuery();

    const initialized = React.useRef(false);

    useEffect(() => {
        if (userData && !initialized.current) {
            initialized.current = true;
            if (userData.view && ["list", "grid"].includes(userData.view)) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setView(userData.view as ViewType);
            }
            if (userData.theme) {
                setTheme(userData.theme);
            }
        }
    }, [userData, setView, setTheme]);

    return <ViewContext.Provider value={{ view, setView }}>{children}</ViewContext.Provider>;
}

export function useView() {
    const context = useContext(ViewContext);
    if (context === undefined) {
        throw new Error("useView must be used within a ViewProvider");
    }
    return context;
}
