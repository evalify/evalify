"use client";

import { BoldToolbar } from "@/components/rich-text-editor/toolbars/bold";
import { ItalicToolbar } from "@/components/rich-text-editor/toolbars/italic";
import { CodeToolbar } from "@/components/rich-text-editor/toolbars/code";
import { StrikeThroughToolbar } from "@/components/rich-text-editor/toolbars/strikethrough";
import { HardBreakToolbar } from "@/components/rich-text-editor/toolbars/hard-break";
import { HorizontalRuleToolbar } from "@/components/rich-text-editor/toolbars/horizontal-rule";
import { OrderedListToolbar } from "@/components/rich-text-editor/toolbars/ordered-list";
import { BulletListToolbar } from "@/components/rich-text-editor/toolbars/bullet-list";
import { CodeBlockToolbar } from "@/components/rich-text-editor/toolbars/code-block";
import { BlockquoteToolbar } from "@/components/rich-text-editor/toolbars/blockquote";
import { RedoToolbar } from "@/components/rich-text-editor/toolbars/redo";
import { UndoToolbar } from "@/components/rich-text-editor/toolbars/undo";
import { ImagePlaceholderToolbar } from "@/components/rich-text-editor/toolbars/image-placeholder-toolbar";
import { ColorHighlightToolbar } from "@/components/rich-text-editor/toolbars/color-and-highlight";
import { Latex } from "@/components/rich-text-editor/toolbars/latex";
import { Separator } from "@/components/ui/separator";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToolbar } from "./toolbars/toolbar-provider";

export function EditorToolbar() {
    const { editor } = useToolbar();

    const toolbarComponents = (
        <>
            <UndoToolbar />
            <RedoToolbar />
            <Separator orientation="vertical" className="h-7" />
            <BoldToolbar />
            <ItalicToolbar />
            <StrikeThroughToolbar />
            <BulletListToolbar />
            <OrderedListToolbar />
            <CodeToolbar />
            <CodeBlockToolbar />
            <HorizontalRuleToolbar />
            <ImagePlaceholderToolbar />
            <BlockquoteToolbar />
            <HardBreakToolbar />
            <ColorHighlightToolbar />
            <Separator orientation="vertical" className="h-7" />
            <Latex />
        </>
    );
    const mobileMenu = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Menu className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60">
                <DropdownMenuLabel>Editor Tools</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => editor?.chain().focus().undo().run()}>
                        Undo
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => editor?.chain().focus().redo().run()}>
                        Redo
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem
                        onSelect={() => editor?.chain().focus().toggleMark("bold").run()}
                    >
                        Bold
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={() => editor?.chain().focus().toggleMark("italic").run()}
                    >
                        Italic
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={() => editor?.chain().focus().toggleMark("strike").run()}
                    >
                        Strikethrough
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={() => editor?.chain().focus().toggleMark("code").run()}
                    >
                        Code
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem
                        onSelect={() => editor?.chain().focus().toggleBulletList().run()}
                    >
                        Bullet List
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={() => editor?.chain().focus().toggleOrderedList().run()}
                    >
                        Ordered List
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={() => editor?.chain().focus().toggleCodeBlock().run()}
                    >
                        Code Block
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={() => editor?.chain().focus().toggleBlockquote().run()}
                    >
                        Blockquote
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem
                        onSelect={() => editor?.chain().focus().setHorizontalRule().run()}
                    >
                        Horizontal Rule
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => editor?.chain().focus().setHardBreak().run()}>
                        Line Break
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={() => editor?.chain().focus().insertImagePlaceholder().run()}
                    >
                        Insert Image
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
    return (
        <div className="flex w-full p-3 h-full items-center">
            <div className="sm:hidden">{mobileMenu}</div>

            <div className="hidden sm:flex md:hidden flex-wrap items-center gap-2 [&>button]:shrink-0">
                <UndoToolbar />
                <RedoToolbar />
                <Separator orientation="vertical" className="h-7" />
                <BoldToolbar />
                <ItalicToolbar />
                <StrikeThroughToolbar />
                <BulletListToolbar />
                <OrderedListToolbar />
                <ImagePlaceholderToolbar />
                <Separator orientation="vertical" className="h-7" />
                {mobileMenu}
            </div>

            <div className="hidden md:flex flex-wrap items-center gap-2 [&>button]:shrink-0">
                {toolbarComponents}
            </div>
        </div>
    );
}
