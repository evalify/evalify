"use client";

import { Button } from "@/components/ui/button";
import React, { useEffect, useRef, useState } from "react";

const globalState = {
    hasPermission: false,
    violations: [] as Array<{ message: string; timestamp: Date }>,
};

// Make globalState accessible from window
(window as any).globalState = globalState;

const PermissionRequest = ({ onGranted }: { onGranted: () => void }) => {
    const requestFullscreen = async () => {
        try {
            await document.documentElement.requestFullscreen();
            globalState.hasPermission = true;
            onGranted();
        } catch (err) {
            console.error("Fullscreen permission denied:", err);
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

const SecureExam = ({
    children,
    allowCopyPaste = false,
    enableTabSwitchDetection = true,
    enableShortcutsRestriction = true,
}: {
    children: React.ReactNode;
    allowCopyPaste?: boolean;
    enableTabSwitchDetection?: boolean;
    enableShortcutsRestriction?: boolean;
}) => {
    const [violations, setViolations] = useState(globalState.violations);
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
    const logRef = useRef<HTMLUListElement>(null);

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
            console.error("Fullscreen permission denied:", err);
        }
    };

    useEffect(() => {
        // Scroll to the bottom whenever the violations array changes
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [violations]);

    useEffect(() => {
        document.addEventListener("fullscreenchange", enforceFullscreen);

        if (globalState.hasPermission) {
            document.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                handleViolation("Right-click is not allowed");
            });

            if (!allowCopyPaste && enableShortcutsRestriction) {
                document.addEventListener("keydown", (e) => {
                    if (
                        (e.ctrlKey || e.metaKey) &&
                        ["c", "v", "x"].includes(e.key.toLowerCase())
                    ) {
                        e.preventDefault();
                        handleViolation("Copy/Cut/Paste is not allowed");
                    }
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
        <div className="w-full h-screen">
            <div className="fixed top-0 left-0 right-0 p-2">
                <h1 className="text-center text-lg font-bold">Secure Exam Environment</h1>
            </div>

            <div className="p-4 pt-12 h-full">{children}</div>

            <div className="fixed bottom-0 left-0 right-0 p-2">
                <h3 className="text-sm font-bold mb-2">Violations Log ({violations.length}):</h3>
                <ul ref={logRef} className="text-xs max-h-24 overflow-auto">
                    {violations.map((v, idx) => (
                        <li key={idx} className="mb-1">
                            {new Date(v.timestamp).toLocaleTimeString()}: {v.message}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default function QuizLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [hasPermission, setHasPermission] = useState(globalState.hasPermission);

    if (!hasPermission) {
        return <PermissionRequest onGranted={() => setHasPermission(true)} />;
    }

    return (
        <SecureExam allowCopyPaste={false}>
            {children}
        </SecureExam>
    );
}
