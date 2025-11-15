"use client";

import { Extension, Node, NodeViewProps } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { InlineMath, BlockMath } from "react-katex";
import React, { useCallback, useState } from "react";
import { decodeLatex } from "@/lib/latex/latex";
import { LatexDialog } from "@/components/rich-text-editor/latex-dialog";
import { LaTeXErrorBoundary } from "@/components/rich-text-editor/editor-error-boundary";

const LatexComponent = (props: NodeViewProps) => {
    const { node, updateAttributes } = props;
    const { inline, formula } = node.attrs;
    const [showSource, setShowSource] = useState(false);
    const [showLatexDialog, setShowLatexDialog] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [decodedFormula, setDecodedFormula] = useState("");

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setShowLatexDialog(true);
    }, []);

    const handleLatexUpdate = useCallback(
        (newFormula: string) => {
            updateAttributes({ formula: newFormula });
            setHasError(false);
        },
        [updateAttributes]
    );

    React.useEffect(() => {
        const handleClickOutside = () => {
            if (showSource) {
                setShowSource(false);
            }
        };

        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [showSource]);

    // Decode formula outside of render logic
    React.useEffect(() => {
        try {
            const decoded = decodeLatex(formula);
            setDecodedFormula(decoded);
            setHasError(false);
        } catch (err) {
            console.error("Error decoding LaTeX:", err);
            setHasError(true);
        }
    }, [formula]);

    if (showSource) {
        return (
            <NodeViewWrapper
                as={inline ? "span" : "div"}
                className={inline ? "inline-node" : "block-node"}
            >
                <span
                    className="inline-block bg-muted/40 p-1 rounded-md mx-1 font-mono text-sm"
                    onClick={(e) => e.stopPropagation()}
                >
                    {inline ? "$" : "$$"}
                    {formula}
                    {inline ? "$" : "$$"}
                </span>
            </NodeViewWrapper>
        );
    }

    if (hasError) {
        return (
            <NodeViewWrapper
                as={inline ? "span" : "div"}
                className={inline ? "inline-node" : "block-node"}
            >
                <span className="text-destructive" onDoubleClick={handleDoubleClick}>
                    Invalid LaTeX
                </span>

                <LatexDialog
                    open={showLatexDialog}
                    onOpenChange={setShowLatexDialog}
                    onInsert={handleLatexUpdate}
                    isInline={inline}
                    initialValue={formula}
                />
            </NodeViewWrapper>
        );
    }

    return (
        <LaTeXErrorBoundary>
            <NodeViewWrapper
                as={inline ? "span" : "div"}
                className={inline ? "inline-node" : "block-node"}
            >
                <span
                    className={`latex-rendered ${inline ? "inline-latex" : "block-latex"}`}
                    onDoubleClick={handleDoubleClick}
                >
                    {inline ? (
                        <InlineMath math={decodedFormula} />
                    ) : (
                        <BlockMath math={decodedFormula} />
                    )}
                </span>

                <LatexDialog
                    open={showLatexDialog}
                    onOpenChange={setShowLatexDialog}
                    onInsert={handleLatexUpdate}
                    isInline={inline}
                    initialValue={formula}
                />
            </NodeViewWrapper>
        </LaTeXErrorBoundary>
    );
};

// Revised LaTeX Node extension
export const LatexNodeExtension = Node.create({
    name: "latex",
    group: "inline",
    inline: true,
    atom: true,

    addAttributes() {
        return {
            formula: {
                default: "",
            },
            inline: {
                default: true,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: "span[data-latex]",
                getAttrs: (node: string | HTMLElement) => {
                    if (typeof node === "string" || !(node instanceof HTMLElement)) return {};
                    return {
                        formula: node.getAttribute("data-formula") || "",
                        inline: node.getAttribute("data-inline") === "true",
                    };
                },
            },
        ];
    },

    renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
        return [
            "span",
            {
                "data-latex": "",
                "data-formula": HTMLAttributes.formula,
                "data-inline": HTMLAttributes.inline,
                class: HTMLAttributes.inline ? "inline-latex" : "block-latex",
            },
            `${HTMLAttributes.inline ? "$" : "$$"}${HTMLAttributes.formula}${
                HTMLAttributes.inline ? "$" : "$$"
            }`,
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(LatexComponent);
    },
});

// Basic LaTeX extension
export const LaTeX = Extension.create({
    name: "latex-attr",
    addGlobalAttributes() {
        return [
            {
                types: ["textStyle"],
                attributes: {
                    latex: {
                        default: false,
                        parseHTML: (element: HTMLElement) => element.hasAttribute("data-latex"),
                        renderHTML: (attributes: Record<string, unknown>) => {
                            if (!attributes.latex) return {};
                            return { "data-latex": "" };
                        },
                    },
                },
            },
        ];
    },
});
