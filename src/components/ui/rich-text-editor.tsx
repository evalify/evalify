import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Button } from './button';
import {
    Bold, Italic, Underline, Strikethrough,
    List, ListOrdered, Image as ImageIcon,
    AlignLeft, AlignCenter, AlignRight,
    Heading1, Heading2, Heading3,
    Quote, Code, Link, Undo, Redo
} from 'lucide-react';
import { Separator } from './separator';
import { Extension } from '@tiptap/core';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

// Make sure LaTeX is exported
export const LaTeX = Extension.create({
    name: 'latex',
    addGlobalAttributes() {
        return [
            {
                types: ['textStyle'],
                attributes: {
                    latex: {
                        default: false,
                        parseHTML: element => element.hasAttribute('data-latex'),
                        renderHTML: attributes => {
                            if (!attributes.latex) return {};
                            return { 'data-latex': '' };
                        }
                    }
                }
            }
        ];
    }
});

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3]
                }
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'max-w-full rounded-lg dark:border-gray-700',
                },
                inline: true,
            }),
            LaTeX,
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base dark:prose-invert max-w-none min-h-[150px] p-4 focus:outline-none',
            },
        },
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const { url } = await response.json();
            editor?.chain().focus().setImage({ src: url }).run();
        } catch (error) {
            console.log('Error uploading image:', error);
        }
    };

    // Add LaTeX button handler
    const insertLatex = () => {
        const latex = prompt('Enter LaTeX formula:');
        if (latex) {
            editor?.chain().focus().insertContent(`$${latex}$`).run();
        }
    };

    if (!editor) return null;

    return (
        <div className="border rounded-lg overflow-hidden dark:border-gray-700">
            <div className="border-b bg-muted/50 p-2 flex flex-wrap gap-1 dark:border-gray-700">
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={editor.isActive('bold') ? 'bg-muted' : ''}
                    >
                        <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={editor.isActive('italic') ? 'bg-muted' : ''}
                    >
                        <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        className={editor.isActive('strike') ? 'bg-muted' : ''}
                    >
                        <Strikethrough className="h-4 w-4" />
                    </Button>
                </div>


                <Separator orientation="vertical" className="h-6" />

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                        className={editor.isActive('codeBlock') ? 'bg-muted' : ''}
                    >
                        <Code className="h-4 w-4" />
                    </Button>
                </div>

                <Separator orientation="vertical" className="h-6" />

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                    >
                        <Undo className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                    >
                        <Redo className="h-4 w-4" />
                    </Button>
                </div>

                <Separator orientation="vertical" className="h-6" />

                <div className="relative">
                    <Button variant="ghost" size="sm" className="relative overflow-hidden">
                        <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                        <ImageIcon className="h-4 w-4" />
                    </Button>
                </div>

                <Separator orientation="vertical" className="h-6" />

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={insertLatex}
                    >
                        <span className="font-serif">TEX</span>
                    </Button>
                </div>
            </div>
            <EditorContent editor={editor} placeholder={placeholder} />
        </div>
    );
}
