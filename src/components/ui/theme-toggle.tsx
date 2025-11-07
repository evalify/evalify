"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch by only rendering after mount
    // Defer the state update to avoid synchronous setState in effect
    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(t);
    }, []);

    const toggleTheme = () => {
        setTheme(theme === "light" ? "dark" : "light");
    };

    if (!mounted) {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-8 right-8 z-20 p-3 rounded-xl transition-all duration-300 bg-gray-100 dark:bg-gray-800 shadow-lg opacity-0"
                disabled
            >
                <Sun className="h-5 w-5" />
                <span className="sr-only">Toggle theme</span>
            </Button>
        );
    }

    const isDark = theme === "dark";

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={`fixed top-8 right-8 z-20 p-3 rounded-xl transition-all duration-300 hover:scale-110 ${
                isDark
                    ? "bg-white/10 text-white border border-white/20 backdrop-blur-sm hover:bg-white/20"
                    : "bg-black/10 text-black border border-black/20 backdrop-blur-sm hover:bg-black/20"
            } shadow-lg`}
        >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
