"use client";

import { useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import { trpc } from "@/lib/trpc/client";
import { extractMinioKeyFromUrl, isMinioImageUrl } from "@/lib/utils";
import { logger } from "@/lib/logger";

export function useImageDeletion(editor: Editor | null) {
    const currentImages = useRef<Set<string>>(new Set());
    const pendingDeletions = useRef<Map<string, NodeJS.Timeout>>(new Map());
    const deleteMutation = trpc.fileUpload.deleteImage.useMutation();
    const deleteRef = useRef(deleteMutation);
    deleteRef.current = deleteMutation;

    useEffect(() => {
        if (!editor) return;

        const getImages = (): Set<string> => {
            const images = new Set<string>();
            editor.state.doc.descendants((node) => {
                if (node.type.name === "image" && node.attrs.src) {
                    images.add(node.attrs.src as string);
                }
            });
            return images;
        };

        currentImages.current = getImages();

        const handleUpdate = () => {
            const newImages = getImages();
            const oldImages = currentImages.current;

            oldImages.forEach((imageUrl) => {
                if (!newImages.has(imageUrl)) {
                    if (!isMinioImageUrl(imageUrl)) {
                        return;
                    }

                    const key = extractMinioKeyFromUrl(imageUrl);
                    if (!key) return;

                    if (pendingDeletions.current.has(imageUrl)) return;

                    const timeoutId = setTimeout(async () => {
                        try {
                            await deleteRef.current.mutateAsync({ key });
                        } catch (error) {
                            logger.error("Failed to delete image:", error);
                        } finally {
                            pendingDeletions.current.delete(imageUrl);
                        }
                    }, 5000);

                    pendingDeletions.current.set(imageUrl, timeoutId);
                }
            });

            newImages.forEach((imageUrl) => {
                if (pendingDeletions.current.has(imageUrl)) {
                    clearTimeout(pendingDeletions.current.get(imageUrl));
                    pendingDeletions.current.delete(imageUrl);
                }
            });

            currentImages.current = newImages;
        };

        editor.on("update", handleUpdate);

        return () => {
            editor.off("update", handleUpdate);
        };
    }, [editor]);
}
