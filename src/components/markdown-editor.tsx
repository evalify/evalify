import React, { useCallback, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bold, Italic, List, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import { CropDialog } from './ui/crop-dialog';

interface MarkdownEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

export function MarkdownEditor({ content, onChange, placeholder }: MarkdownEditorProps) {
    const [showPreview, setShowPreview] = useState(false);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [imageToEdit, setImageToEdit] = useState<string | null>(null);

    const insertText = (before: string, after: string = '') => {
        const textarea = document.querySelector('textarea');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
        onChange(newText);

        // Reset cursor position
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(
                start + before.length,
                end + before.length
            );
        }, 0);
    };

    const handleImageUpload = async (file: File) => {
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch('/api/upload/question-image', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');
            const data = await response.json();
            insertText(`![Image](${data.url})`);
        } catch (error) {
            console.error('Failed to upload image:', error);
        }
    };

    const handleImageSelect = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                    setImageToEdit(reader.result as string);
                    setCropDialogOpen(true);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        setImageToEdit(reader.result as string);
                        setCropDialogOpen(true);
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
    }, []);

    return (
        <div className="w-full">
            <div className="flex items-center gap-1 border-b p-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertText('**', '**')}
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertText('*', '*')}
                >
                    <Italic className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertText('\n- ')}
                >
                    <List className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleImageSelect}
                >
                    <ImageIcon className="h-4 w-4" />
                </Button>
                <div className="flex-1" />
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                >
                    {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>

            <div className={cn("grid", showPreview && "grid-cols-2 gap-4")}>
                <Textarea
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="min-h-[200px] font-mono"
                    onPaste={handlePaste}
                />
                
                {showPreview && (
                    <div className="prose dark:prose-invert max-w-none p-4 border rounded-md">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                img: (props) => (
                                    <div className="relative w-full h-[300px] my-4">
                                        <Image
                                            src={props.src || ''}
                                            alt={props.alt || ''}
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                )
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                )}
            </div>

            {imageToEdit && (
                <CropDialog
                    open={cropDialogOpen}
                    onClose={() => {
                        setCropDialogOpen(false);
                        setImageToEdit(null);
                    }}
                    image={imageToEdit}
                    onCropComplete={async (croppedImage) => {
                        const response = await fetch(croppedImage);
                        const blob = await response.blob();
                        const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
                        await handleImageUpload(file);
                        setCropDialogOpen(false);
                        setImageToEdit(null);
                    }}
                />
            )}
        </div>
    );
}
