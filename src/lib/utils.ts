import { Editor } from "@tiptap/react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const languages = [
    { id: "octave", name: "Matlab (octave)", language_id: 66 },
    { id: "python", name: "Python", language_id: 71 },
    { id: "c", name: "C", language_id: 50 },
    { id: "java", name: "Java", language_id: 62 },
    { id: "cpp", name: "C++", language_id: 54 },
    { id: "javascript", name: "JavaScript", language_id: 63 },
];

export function getInitials(name: string): string {
    const words = name.split(" ");
    if (words.length === 0) {
        return "";
    }
    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function isValidUrl(url: string) {
    return /^https?:\/\/\S+$/.test(url);
}

export const duplicateContent = (editor: Editor) => {
    const { view } = editor;
    const { state } = view;
    const { selection } = state;

    editor
        .chain()
        .insertContentAt(
            selection.to,
            selection.content().content.firstChild
                ? selection.content().content.firstChild?.toJSON() || {}
                : {},
            {
                updateSelection: true,
            }
        )
        .focus(selection.to)
        .run();
};

export function processImageUrl(imageUrl: string): string {
    if (!imageUrl) return "";

    if (isValidUrl(imageUrl)) {
        return imageUrl;
    }

    if (imageUrl.startsWith("/uploads/")) {
        return imageUrl;
    }
    if (imageUrl.startsWith("data:")) {
        console.warn("Data URL detected, should be processed via upload API");
    }

    return imageUrl;
}
