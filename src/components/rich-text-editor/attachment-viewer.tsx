"use client";

import { FileIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface AttachmentViewerProps {
    files: string[];
    className?: string;
}

export function AttachmentViewer({ files, className = "" }: AttachmentViewerProps) {
    if (!files || files.length === 0) {
        return null;
    }

    const getFileName = (url: string): string => {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split("/");
            return decodeURIComponent(pathParts[pathParts.length - 1]) || "Attachment";
        } catch {
            return url.split("/").pop() || "Attachment";
        }
    };

    const handleOpenFile = (fileUrl: string) => {
        window.open(fileUrl, "_blank", "noopener,noreferrer");
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileIcon className="h-4 w-4" />
                <span>Attached Files</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {files.map((fileUrl, index) => (
                    <Card
                        key={index}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleOpenFile(fileUrl)}
                    >
                        <FileIcon className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm truncate max-w-[200px]">
                            {getFileName(fileUrl)}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                    </Card>
                ))}
            </div>
        </div>
    );
}

export function AttachmentViewerButton({ file }: { file: string }) {
    const getFileName = (url: string): string => {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split("/");
            return decodeURIComponent(pathParts[pathParts.length - 1]) || "Attachment";
        } catch {
            return url.split("/").pop() || "Attachment";
        }
    };

    const handleOpenFile = () => {
        window.open(file, "_blank", "noopener,noreferrer");
    };

    return (
        <Button variant="outline" size="sm" onClick={handleOpenFile} className="gap-2">
            <FileIcon className="h-4 w-4" />
            {getFileName(file)}
            <ExternalLink className="h-3 w-3" />
        </Button>
    );
}
