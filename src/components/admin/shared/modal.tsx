import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
    Backdrop?: boolean;
}

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = "md",
    Backdrop = false,
}: ModalProps) {
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-2xl",
        xl: "max-w-4xl",
        "2xl": "max-w-6xl",
        "3xl": "max-w-7xl",
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className={`fixed inset-0  transition-opacity ${Backdrop ? " bg-black/50" : ""}`}
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`relative w-full ${sizeClasses[size]} mx-4 max-h-[90vh] overflow-hidden`}
            >
                <Card className="border border-gray-200 dark:border-gray-700 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                        <CardTitle className="text-gray-900 dark:text-gray-100">{title}</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="max-h-[75vh] overflow-y-auto">{children}</CardContent>
                </Card>
            </div>
        </div>
    );
}
