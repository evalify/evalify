import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Extension } from '@tiptap/core';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

interface TiptapRendererProps {
    content: string;
}

// Custom extension to handle LaTeX
const LatexExtension = Extension.create({
    name: 'latex',
    addStorage() {
        return {
            lastContent: '',
        };
    },
    onCreate() {
        // Process initial content
        this.storage.lastContent = this.editor.getHTML();
    },
});

const TiptapRenderer = ({ content }: TiptapRendererProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-lg dark:border-gray-700',
                },
            }),
            LatexExtension,
        ],
        content,
        editable: false,
    });

    if (!editor) return null;

    // Process content to render LaTeX
    const renderContent = () => {
        const parts = content.split(/(\$[^$]+\$)/g);
        return (
            <div className="prose dark:prose-invert max-w-none">
                {parts.map((part, index) => {
                    if (part.startsWith('$') && part.endsWith('$')) {
                        // Extract LaTeX content without the $ symbols
                        const latex = part.slice(1, -1);
                        return (
                            <span key={index} className="inline-block mx-1">
                                <InlineMath math={latex} />
                            </span>
                        );
                    }
                    // For non-LaTeX content, use TipTap to render
                    return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
                })}
            </div>
        );
    };

    return (
        <div className="prose dark:prose-invert max-w-none">
            {renderContent()}
            <style jsx global>{`
                img {
                    max-width: 200px;
                    height: auto;
                }
            `}</style>
        </div>
    );
};

export default TiptapRenderer;
