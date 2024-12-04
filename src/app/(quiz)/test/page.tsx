"use client"
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

// Global state for permissions and violations
const globalState = {
    hasPermission: false,
    violations: [] as Array<{ message: string, timestamp: Date }>
};

const PermissionRequest = ({ onGranted }: { onGranted: () => void }) => {
    const [isRequestingFullscreen, setIsRequestingFullscreen] = useState(false);

    const handleStart = () => {
        setIsRequestingFullscreen(true);
    };

    const handleFullscreenRequest = async () => {
        try {
            await document.documentElement.requestFullscreen();
            globalState.hasPermission = true;
            onGranted();
        } catch (err) {
            console.log("Permission denied:", err);
            setIsRequestingFullscreen(false);
        }
    };

    if (isRequestingFullscreen) {
        return (
            <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center">
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
                    <h2 className="text-xl font-bold mb-4">Enable Fullscreen</h2>
                    <p className="mb-4">Click the button below to enter fullscreen mode</p>
                    <button
                        onClick={handleFullscreenRequest}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Enter Fullscreen
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
                <h2 className="text-xl font-bold mb-4">Before You Begin</h2>
                <p className="mb-4">This secure exam environment requires fullscreen mode.</p>
                <button
                    onClick={handleStart}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Start Exam
                </button>
            </div>
        </div>
    );
};

const SecureExam = ({
    children,
    allowCopyPaste = false,
    enableFullscreenMode = true,
    enableTabSwitchDetection = true,
    enableShortcutsRestriction = true,
    enableNavigationRestriction = true,
}) => {
    const [violations, setViolations] = useState<Array<{ message: string, timestamp: Date }>>(globalState.violations);

    const handleViolation = (message: string) => {
        const violation = { message, timestamp: new Date() };
        setViolations(prev => [...prev, violation]);
        globalState.violations.push(violation);
    };

    const preventContextMenu = (event: MouseEvent) => {
        event.preventDefault();
        handleViolation("Right-click is not allowed");
        return false;
    };

    const initializeSecurity = () => {
        document.addEventListener('contextmenu', preventContextMenu);

        if (enableFullscreenMode) {
            const enforceFullscreen = () => {
                if (!document.fullscreenElement) {
                    handleViolation("Fullscreen mode exit attempted");
                    document.documentElement.requestFullscreen().catch(() => {
                        handleViolation("Failed to re-enter fullscreen");
                    });
                }
            };

            document.addEventListener("fullscreenchange", enforceFullscreen);
        }

        if (!allowCopyPaste && enableShortcutsRestriction) {
            const handleKeyDown = (event: KeyboardEvent) => {
                if ((event.ctrlKey || event.metaKey) &&
                    (event.key === 'c' || event.key === 'v' || event.key === 'x')) {
                    event.preventDefault();
                    handleViolation("Copy/Paste/Cut is not allowed");
                }
            };

            document.addEventListener("keydown", handleKeyDown);
        }

        if (enableTabSwitchDetection) {
            const handleVisibilityChange = () => {
                if (document.hidden) {
                    handleViolation("Tab switching or minimizing is not allowed");
                }
            };

            document.addEventListener("visibilitychange", handleVisibilityChange);
        }

        if (enableNavigationRestriction) {
            const handleBeforeUnload = (event: BeforeUnloadEvent) => {
                event.preventDefault();
                event.returnValue = "";
                handleViolation("Attempted to leave the exam page");
            };

            window.addEventListener("beforeunload", handleBeforeUnload);
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                (event.ctrlKey && event.shiftKey && event.key === 'i') ||
                event.key === 'F12' ||
                (event.ctrlKey && event.key === 'u')
            ) {
                event.preventDefault();
                handleViolation("Restricted keyboard shortcut detected");
            }
        };

        document.addEventListener("keydown", handleKeyDown);
    };

    useEffect(() => {
        if (globalState.hasPermission) {
            initializeSecurity();
        }
        return () => {
            document.removeEventListener('contextmenu', preventContextMenu);
            document.removeEventListener("fullscreenchange", () => { });
            document.removeEventListener("keydown", () => { });
            document.removeEventListener("visibilitychange", () => { });
            window.removeEventListener("beforeunload", () => { });
        };
    }, []);

    return (
        <div className="w-full h-screen">
            <div className="fixed top-0 left-0 right-0 bg-gray-100 p-2">
                <h1 className="text-center text-lg font-bold">Secure Exam Environment</h1>
            </div>

            <div className="p-4 pt-12 h-full">
                {children}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-gray-100 p-2">
                <h3 className="text-sm font-bold mb-2">Violations Log:</h3>
                <ul className="text-xs max-h-24 overflow-auto">
                    {violations.map((v, idx) => (
                        <li key={idx} className="mb-1">
                            {v.timestamp.toLocaleTimeString()}: {v.message}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const ExamPage = () => {
    const [hasPermission, setHasPermission] = useState(globalState.hasPermission);

    if (!hasPermission) {
        return <PermissionRequest onGranted={() => setHasPermission(true)} />;
    }

    return (
        <SecureExam allowCopyPaste={false}>
            <div>
                <h2 className="text-xl mb-4">Exam Content</h2>
                <p>Your secure exam interface goes here.</p>
                <Input />
            </div>
        </SecureExam>
    );
};

export { SecureExam, globalState };
export default ExamPage;