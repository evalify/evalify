"use client";

import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react"; // Remove useRef
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const globalState = {
    hasPermission: false,
    violations: [] as Array<{ message: string; timestamp: Date }>,
};

const SecureExam = ({ children, allowCopyPaste = false, enableTabSwitchDetection = true, enableShortcutsRestriction = true }) => {
    const [violations, setViolations] = useState(globalState.violations);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Initialize globalState in useEffect
    useEffect(() => {
        (window as any).globalState = globalState;
        setIsFullscreen(!!document.fullscreenElement);

        // Disable Esc key
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Add useEffect to load violations from localStorage
    useEffect(() => {
        const pathSegments = window.location.pathname.split('/');
        const quizId = pathSegments[pathSegments.length - 1];
        const storedViolations = localStorage.getItem(`violations_${quizId}`);

        if (storedViolations) {
            const parsedViolations = JSON.parse(storedViolations);
            setViolations(parsedViolations);
            globalState.violations = parsedViolations;
        }
    }, []);

    const handleViolation = (message: string) => {
        const violation = { message, timestamp: new Date() };

        // Get quiz ID from URL path
        const pathSegments = window.location.pathname.split('/');
        const quizId = pathSegments[pathSegments.length - 1];

        if (quizId) {
            // Get existing violations from localStorage
            const existingViolations = JSON.parse(localStorage.getItem(`violations_${quizId}`) || '[]');
            // Append new violation
            const updatedViolations = [...existingViolations, violation];
            // Update localStorage
            localStorage.setItem(`violations_${quizId}`, JSON.stringify(updatedViolations));
            // Update state and global state
            setViolations(updatedViolations);
            globalState.violations = updatedViolations;
        }
    };

    const enforceFullscreen = () => {
        if (!document.fullscreenElement) {
            handleViolation("Fullscreen mode exited");
            setIsFullscreen(false);
        }
    };

    const requestFullscreen = async () => {
        try {
            await document.documentElement.requestFullscreen();
            globalState.hasPermission = true;
            setIsFullscreen(true);
        } catch (err) {
            console.log("Fullscreen permission denied:", err);
        }
    };

    useEffect(() => {
        document.addEventListener("fullscreenchange", enforceFullscreen);

        if (globalState.hasPermission) {
            document.addEventListener("contextmenu", (e) => {
                e.preventDefault();
            });

            if (!allowCopyPaste && enableShortcutsRestriction) {
                document.addEventListener("keydown", (e) => {
                    if (e.ctrlKey && e.shiftKey && e.key === "i") {
                        e.preventDefault();
                        handleViolation("Developer tools shortcut detected");
                    }
                });
            }

            if (enableTabSwitchDetection) {
                document.addEventListener("visibilitychange", () => {
                    if (document.hidden) {
                        handleViolation("Tab switching is not allowed");
                    }
                });
            }
        }

        return () => {
            document.removeEventListener("fullscreenchange", enforceFullscreen);
            document.removeEventListener("contextmenu", () => { });
            document.removeEventListener("keydown", () => { });
            document.removeEventListener("visibilitychange", () => { });
        };
    }, [allowCopyPaste, enableShortcutsRestriction, enableTabSwitchDetection]);

    if (!isFullscreen) {
        return (
            <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center">
                <div className=" p-6 rounded-lg shadow-lg max-w-md text-center">
                    <h2 className="text-xl font-bold mb-4">Fullscreen Required</h2>
                    <p className="mb-4">
                        Please re-enable fullscreen mode to continue.
                    </p>
                    <Button
                        onClick={requestFullscreen}
                        className="px-4 py-2 rounded"
                    >
                        Enter Fullscreen
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-[90vh]">
            {/* Floating Violations Counter */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "fixed top-2 right-36 z-50",
                            violations.length > 0 && "bg-red-100 hover:bg-red-200 border-red-500 text-red-600"
                        )}
                    >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        {violations.length} Violations
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                    <div className="space-y-2">
                        <h4 className="font-medium">Violations Log</h4>
                        <ScrollArea className="h-[200px]">
                            {violations.map((v, idx) => (
                                <div key={idx} className="text-sm py-1 border-b last:border-0">
                                    <span className="text-muted-foreground text-xs">
                                        {new Date(v.timestamp).toLocaleTimeString()}:
                                    </span>{' '}
                                    {v.message}
                                </div>
                            ))}
                        </ScrollArea>
                    </div>
                </PopoverContent>
            </Popover>

            <div className="">
                {children}
            </div>
        </div>
    );
};

const PermissionRequest = ({ onGranted }: { onGranted: () => void }) => {
    const requestFullscreen = async () => {
        try {
            await document.documentElement.requestFullscreen();
            globalState.hasPermission = true;
            onGranted();
        } catch (err) {
            console.log("Fullscreen permission denied:", err);
        }
    };

    return (
        <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center">
            <div className=" p-6 rounded-lg shadow-lg max-w-md text-center">
                <h2 className="text-xl font-bold mb-4">Enable Fullscreen</h2>
                <p className="mb-4">You must enable fullscreen mode to proceed.</p>
                <Button
                    onClick={requestFullscreen}
                    className="px-4 py-2 rounded"
                >
                    Enter Fullscreen
                </Button>
            </div>
        </div>
    );
};

export default function QuizLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [hasPermission, setHasPermission] = useState(false);

    useEffect(() => {
        globalState.hasPermission = hasPermission;
    }, [hasPermission]);

    if (!hasPermission) {
        return <PermissionRequest onGranted={() => setHasPermission(true)} />;
    }

    return (
        <SecureExam allowCopyPaste={true}>
            {children}
        </SecureExam>
    );
}
