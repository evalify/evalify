import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Extension } from '@tiptap/core';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface TiptapRendererProps {
    content: string;
}

const LatexExtension = Extension.create({
    name: 'latex',
    addStorage() {
        return { lastContent: '' };
    },
    onCreate() {
        this.storage.lastContent = this.editor.getHTML();
    },
});

const TiptapRenderer = ({ content }: TiptapRendererProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({
                HTMLAttributes: { class: 'rounded-lg dark:border-gray-700' },
            }),
            LatexExtension,
        ],
        content,
        editable: false,
    });

    if (!editor) return null;

    const renderContent = () => {
        const parts = content.split(/(\$\$.*?\$\$|\$.*?\$)/g); // Split by LaTeX delimiters

        return (
            <div className="prose dark:prose-invert max-w-none">
                {parts.map((part, index) => {
                    if (part.startsWith('$$') && part.endsWith('$$')) {
                        // Block LaTeX
                        const latex = part.slice(2, -2).trim();
                        return (
                            <div key={index} className="block-latex">
                                <BlockMath math={latex} />
                            </div>
                        );
                    } else if (part.startsWith('$') && part.endsWith('$')) {
                        // Inline LaTeX
                        const latex = part.slice(1, -1).trim();
                        return (
                            <span key={index} className="inline-latex">
                                <InlineMath math={latex} />
                            </span>
                        );
                    }
                    // For non-LaTeX content, render raw HTML safely
                    return (
                        <span
                            key={index}
                            dangerouslySetInnerHTML={{ __html: part }}
                        />
                    );
                })}
            </div>
        );
    };

    return (
        <div className="prose dark:prose-invert max-w-none">
            {renderContent()}
            <style jsx global>{`
                img {
                    max-width: 100%;
                    height: auto;
                }
                .block-latex {
                    display: block;
                    margin: 1em 0;
                }
                .inline-latex {
                    display: inline;
                }
            `}</style>
        </div>
    );
};

export default TiptapRenderer;
