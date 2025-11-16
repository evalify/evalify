"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { NavigationConfig, defaultNavigationConfig } from "../navigation-config";

interface NavigationContextType {
    config: NavigationConfig;
    updateConfig: (newConfig: Partial<NavigationConfig>) => void;
    resetConfig: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
    const [config, setConfig] = useState<NavigationConfig>(defaultNavigationConfig);

    const updateConfig = useCallback((newConfig: Partial<NavigationConfig>) => {
        setConfig((prev) => {
            const merged = { ...prev };
            Object.entries(newConfig).forEach(([key, value]) => {
                if (value) {
                    merged[key] = value;
                }
            });
            return merged;
        });
    }, []);

    const resetConfig = useCallback(() => {
        setConfig(defaultNavigationConfig);
    }, []);

    return (
        <NavigationContext.Provider value={{ config, updateConfig, resetConfig }}>
            {children}
        </NavigationContext.Provider>
    );
}

export function useNavigationConfig() {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error("useNavigationConfig must be used within a NavigationProvider");
    }
    return context;
}
