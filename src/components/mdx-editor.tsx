import { useState, useCallback, useMemo } from 'react';
import {
    MDXEditor,
    UndoRedo,
    BoldItalicUnderlineToggles,
    headingsPlugin,
    listsPlugin,
    markdownShortcutPlugin,
    linkPlugin,
    toolbarPlugin,
    imagePlugin,
    type MDXEditorMethods,
    ListsToggle
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { ImageIcon, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { Preview } from './preview';
import { CropDialog } from './ui/crop-dialog';

interface MarkdownEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    editorRef?: React.RefObject<MDXEditorMethods>;
}

export function MarkdownEditor({
    content,
    onChange,
    placeholder,
    editorRef
}: MarkdownEditorProps) {
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [imageToEdit, setImageToEdit] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    const handleImageUpload = useCallback(async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/upload/question-image', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) throw new Error('Failed to upload image');
        const data = await response.json();
        return data.url;
    }, []);

    const handleImageProcess = useCallback(async (imageData: string | File) => {
        if (imageData instanceof File) {
            const reader = new FileReader();
            reader.onload = () => {
                setImageToEdit(reader.result as string);
                setCropDialogOpen(true);
            };
            reader.readAsDataURL(imageData);
            return;
        }

        setImageToEdit(imageData);
        setCropDialogOpen(true);
    }, []);

    const handleCroppedImage = async (croppedImageUrl: string) => {
        try {
            const response = await fetch(croppedImageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });

            const url = await handleImageUpload(file);
            editorRef?.current?.insertMarkdown(`![Image](${url})`);
        } catch (error) {
            console.log('Failed to process cropped image:', error);
        }
    };

    const CustomToolbar = useMemo(() => {
        return () => (
            <div className="flex items-center justify-between border-b p-1">
                <div className="flex items-center gap-0.5">
                    <UndoRedo />
                    <div className="w-px h-4 bg-border mx-1" />
                    <BoldItalicUnderlineToggles />
                    <div className="w-px h-4 bg-border mx-1" />
                    <ListsToggle />
                    <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = async (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) await handleImageProcess(file);
                            };
                            input.click();
                        }}>
                        <ImageIcon className="h-4 w-4" />
                    </Button>
                </div>
                <Button
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => setShowPreview(!showPreview)}
                >
                    {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
        );
    }, [showPreview, handleImageProcess]);

    const plugins = useMemo(() => [
        toolbarPlugin({ toolbarContents: CustomToolbar }),
        headingsPlugin(),
        listsPlugin(),
        linkPlugin(),
        imagePlugin({
            imageUploadHandler: handleImageUpload,
            imageRenderer: ({ src, alt }) => (
                <Image src={src} alt={alt} width={600} height={400} className="rounded-md border shadow-sm object-contain max-h-96" />
            ),
        }),
        markdownShortcutPlugin(),
    ], [CustomToolbar, handleImageUpload]);

    const handlePaste = useCallback(async (event: ClipboardEvent) => {
        const items = event.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    await handleImageProcess(file);
                }
            }
        }
    }, [handleImageProcess]);

    return (
        <>
            <div className={cn(
                "rounded-md border",
                "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                "dark:bg-muted/50"
            )}>
                <div className={cn(
                    "grid",
                    showPreview && "grid-cols-2 divide-x"
                )}>
                    <div className={cn(
                        "min-h-[200px]",
                        showPreview && "max-h-[400px] overflow-y-auto"
                    )}>
                        <MDXEditor
                            ref={editorRef}
                            markdown={content}
                            onChange={onChange}
                            placeholder={placeholder}
                            plugins={plugins}
                            contentEditableClassName={cn(
                                "prose dark:prose-invert max-w-none px-3 py-2 focus:outline-none min-h-[100px]",
                                "prose-img:rounded-md prose-img:border prose-img:shadow-sm",
                                "prose-img:max-h-96 prose-img:object-contain",
                            )}
                            suppressHydrationWarning
                            onPaste={handlePaste}
                        />
                    </div>
                    {showPreview && (
                        <div className="min-h-[200px] max-h-[400px] overflow-y-auto p-4">
                            <Preview content={content} />
                        </div>
                    )}
                </div>
            </div>

            {imageToEdit && (
                <CropDialog
                    open={cropDialogOpen}
                    onClose={() => {
                        setCropDialogOpen(false);
                        setImageToEdit(null);
                    }}
                    image={imageToEdit}
                    onCropComplete={handleCroppedImage}
                />
            )}
        </>
    );
}
