"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { renderLatexContent } from "@/lib/latex/latex";
import { enhancePreviewImages, applyTiptapStyling } from "@/lib/latex/preview-helpers";
import { LaTeXErrorBoundary } from "@/components/rich-text-editor/editor-error-boundary";
import DOMPurify from "dompurify";

interface ContentPreviewProps {
    content: string;
    className?: string;
    noProse?: boolean; // Disable prose styling (useful for options to avoid navigation arrows)
}

export function ContentPreview({ content, className, noProse = false }: ContentPreviewProps) {
    const previewRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (previewRef.current && content) {
            const config = {
                ADD_TAGS: ["span", "div", "figcaption"],
                ADD_ATTR: [
                    "data-latex",
                    "data-formula",
                    "data-inline",
                    "data-align",
                    "class",
                    "style",
                ],
                ALLOWED_TAGS: [
                    "h1",
                    "h2",
                    "h3",
                    "h4",
                    "h5",
                    "h6",
                    "p",
                    "br",
                    "hr",
                    "strong",
                    "em",
                    "u",
                    "s",
                    "code",
                    "pre",
                    "ul",
                    "ol",
                    "li",
                    "blockquote",
                    "a",
                    "img",
                    "figure",
                    "figcaption",
                    "table",
                    "thead",
                    "tbody",
                    "tr",
                    "th",
                    "td",
                    "span",
                    "div",
                ],
                ALLOWED_ATTR: [
                    "href",
                    "src",
                    "alt",
                    "title",
                    "class",
                    "style",
                    "data-latex",
                    "data-formula",
                    "data-inline",
                    "data-align",
                    "width",
                    "height",
                ],
            };

            previewRef.current.innerHTML = DOMPurify.sanitize(content, config);

            renderLatexContent(previewRef.current);
            applyTiptapStyling(previewRef.current);
            enhancePreviewImages(previewRef.current);

            const links = previewRef.current.querySelectorAll("a");
            links.forEach((link) => {
                link.setAttribute("target", "_blank");
                link.setAttribute("rel", "noopener noreferrer");
            });

            const clearfix = document.createElement("div");
            clearfix.className = "clearfix";
            clearfix.style.clear = "both";
            previewRef.current.appendChild(clearfix);
        }
    }, [content]);

    return (
        <LaTeXErrorBoundary>
            <div className={cn(!noProse && "border rounded-md", className)}>
                <div
                    ref={previewRef}
                    className={cn(
                        noProse
                            ? "max-w-none overflow-auto min-h-0 [&]:before:hidden [&]:after:hidden [&_*]:before:hidden [&_*]:after:hidden"
                            : "prose dark:prose-invert max-w-none p-4 overflow-auto min-h-0",
                        className
                    )}
                    style={
                        noProse
                            ? {
                                  fontSize: "14px",
                                  lineHeight: "1.5",
                              }
                            : undefined
                    }
                />
            </div>
        </LaTeXErrorBoundary>
    );
}
