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

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

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
                    class: 'max-w-full rounded-lg',
                },
            }),
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
            console.error('Error uploading image:', error);
        }
    };

    if (!editor) return null;

    return (
        <div className="border rounded-lg overflow-hidden">
            <div className="border-b bg-muted/50 p-2 flex flex-wrap gap-1">
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
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={editor.isActive('heading', { level: 1 }) ? 'bg-muted' : ''}
                    >
                        <Heading1 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={editor.isActive('heading', { level: 2 }) ? 'bg-muted' : ''}
                    >
                        <Heading2 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        className={editor.isActive('heading', { level: 3 }) ? 'bg-muted' : ''}
                    >
                        <Heading3 className="h-4 w-4" />
                    </Button>
                </div>

                <Separator orientation="vertical" className="h-6" />

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        className={editor.isActive({ textAlign: 'left' }) ? 'bg-muted' : ''}
                    >
                        <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        className={editor.isActive({ textAlign: 'center' }) ? 'bg-muted' : ''}
                    >
                        <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        className={editor.isActive({ textAlign: 'right' }) ? 'bg-muted' : ''}
                    >
                        <AlignRight className="h-4 w-4" />
                    </Button>
                </div>

                <Separator orientation="vertical" className="h-6" />

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={editor.isActive('bulletList') ? 'bg-muted' : ''}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={editor.isActive('orderedList') ? 'bg-muted' : ''}
                    >
                        <ListOrdered className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className={editor.isActive('blockquote') ? 'bg-muted' : ''}
                    >
                        <Quote className="h-4 w-4" />
                    </Button>
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
            </div>
            <EditorContent editor={editor} placeholder={placeholder} />
        </div>
    );
}
