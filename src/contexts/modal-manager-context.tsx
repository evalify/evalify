"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";

interface ModalManagerContextValue {
    incrementModalCount: () => void;
    decrementModalCount: () => void;
}

const ModalManagerContext = createContext<ModalManagerContextValue | null>(null);

/**
 * Provider that manages modal open count and body scroll-locking across the React tree.
 * Uses a ref to track count without causing re-renders, ensuring server-safe state management.
 */
export function ModalManagerProvider({ children }: { children: ReactNode }) {
    const openModalCountRef = useRef(0);

    const incrementModalCount = () => {
        openModalCountRef.current++;
        if (openModalCountRef.current === 1) {
            // Lock body scroll when first modal opens
            document.body.style.overflow = "hidden";
        }
    };

    const decrementModalCount = () => {
        openModalCountRef.current--;
        if (openModalCountRef.current === 0) {
            // Restore body scroll when last modal closes
            document.body.style.overflow = "unset";
        }
        // Ensure count never goes negative
        if (openModalCountRef.current < 0) {
            openModalCountRef.current = 0;
        }
    };

    return (
        <ModalManagerContext.Provider value={{ incrementModalCount, decrementModalCount }}>
            {children}
        </ModalManagerContext.Provider>
    );
}

/**
 * Hook to access modal manager context.
 * Returns null if used outside ModalManagerProvider, allowing graceful fallback.
 */
export function useModalManager() {
    return useContext(ModalManagerContext);
}
