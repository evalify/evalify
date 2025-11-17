"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Sun, Moon } from "lucide-react";
import { Button } from "../ui/button";
import { useTheme } from "next-themes";

type Props = {
    quizName: string;
    courseCode?: string | null;
    courseName?: string | null;
    userName?: string | null;
    profileId?: string | null;
    profileImage?: string | null;
};

export default function ExamHeader({
    quizName,
    courseCode,
    courseName,
    userName,
    profileId,
    profileImage,
}: Props) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // avoid hydration mismatch — only render theme-dependent UI after mount
    useEffect(() => {
        queueMicrotask(() => setMounted(true));
    }, []);

    const isDark = mounted ? theme === "dark" : false;
    const toggleTheme = () => setTheme(isDark ? "light" : "dark");

    return (
        <header className="w-full bg-surface p-4 border-b">
            <div className=" mx-auto flex items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="text-lg font-semibold">{quizName}</div>
                    <div className="text-sm text-muted-foreground">
                        {courseCode ? <span className="font-medium">{courseCode}</span> : null}
                        {courseName ? <span className="ml-2">{courseName}</span> : null}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                            title={isDark ? "Switch to light" : "Switch to dark"}
                            disabled={!mounted}
                        >
                            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            <span className="sr-only">Toggle theme</span>
                        </Button>
                        <div className="text-right">
                            <div className="text-sm font-medium">{userName || "Student"}</div>
                            <div className="text-xs text-muted-foreground">{profileId || "--"}</div>
                        </div>
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
                            {profileImage ? (
                                <Image
                                    src={profileImage}
                                    alt={userName || "profile"}
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm">
                                    {(userName || "").slice(0, 1).toUpperCase() || "U"}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
