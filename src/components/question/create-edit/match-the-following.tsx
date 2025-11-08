"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Trash2, Plus, GripVertical, X, Edit3, Save, FileText } from "lucide-react";
import { TiptapEditor } from "@/components/rich-text-editor/editor";
import type { MatchTheFollowingQuestion, MatchOptions } from "@/types/questions";
import { Badge } from "@/components/ui/badge";

interface MatchTheFollowingProps {
    value: MatchTheFollowingQuestion;
    onChange: (question: MatchTheFollowingQuestion) => void;
}

export default function MatchTheFollowing({ value, onChange }: MatchTheFollowingProps) {
    const [editingLeftItemId, setEditingLeftItemId] = useState<string | null>(null);
    const [editingRightItemId, setEditingRightItemId] = useState<string | null>(null);
    const [isCreatingNewLeftItem, setIsCreatingNewLeftItem] = useState(false);
    const [isCreatingNewRightItem, setIsCreatingNewRightItem] = useState(false);
    const [editorContent, setEditorContent] = useState("");
    const [draggedItem, setDraggedItem] = useState<{
        type: "left" | "right";
        id: string;
        index: number;
    } | null>(null);
    const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
    const dragCounter = useRef(0);

    const options = value.options ?? [];
    const leftOptions = options
        .filter((opt) => opt.isLeft)
        .sort((a, b) => a.orderIndex - b.orderIndex);
    const rightOptions = options
        .filter((opt) => !opt.isLeft)
        .sort((a, b) => a.orderIndex - b.orderIndex);

    const generateId = () => crypto.randomUUID();

    const handleQuestionChange = (content: string) => {
        onChange({ ...value, question: content });
    };

    const addLeftItem = () => {
        setIsCreatingNewLeftItem(true);
        setIsCreatingNewRightItem(false);
        setEditingLeftItemId(null);
        setEditingRightItemId(null);
        setEditorContent("");
    };

    const addRightItem = () => {
        setIsCreatingNewRightItem(true);
        setIsCreatingNewLeftItem(false);
        setEditingLeftItemId(null);
        setEditingRightItemId(null);
        setEditorContent("");
    };

    const handleSaveItem = () => {
        if (!editorContent.trim()) return;

        if (isCreatingNewLeftItem) {
            const newOption: MatchOptions = {
                id: generateId(),
                text: editorContent,
                orderIndex: leftOptions.length,
                isLeft: true,
                matchPairIds: [],
            };
            onChange({
                ...value,
                options: [...options, newOption],
            });
            setIsCreatingNewLeftItem(false);
        } else if (isCreatingNewRightItem) {
            const newOption: MatchOptions = {
                id: generateId(),
                text: editorContent,
                orderIndex: rightOptions.length,
                isLeft: false,
                matchPairIds: [],
            };
            onChange({
                ...value,
                options: [...options, newOption],
            });
            setIsCreatingNewRightItem(false);
        } else if (editingLeftItemId) {
            onChange({
                ...value,
                options: options.map((opt) =>
                    opt.id === editingLeftItemId ? { ...opt, text: editorContent } : opt
                ),
            });
            setEditingLeftItemId(null);
        } else if (editingRightItemId) {
            onChange({
                ...value,
                options: options.map((opt) =>
                    opt.id === editingRightItemId ? { ...opt, text: editorContent } : opt
                ),
            });
            setEditingRightItemId(null);
        }

        setEditorContent("");
    };

    const handleCancelEdit = () => {
        setIsCreatingNewLeftItem(false);
        setIsCreatingNewRightItem(false);
        setEditingLeftItemId(null);
        setEditingRightItemId(null);
        setEditorContent("");
    };

    const handleEditLeftItem = (id: string) => {
        const item = leftOptions.find((opt) => opt.id === id);
        if (item) {
            setEditingLeftItemId(id);
            setEditorContent(item.text);
            setEditingRightItemId(null);
            setIsCreatingNewLeftItem(false);
            setIsCreatingNewRightItem(false);
        }
    };

    const handleEditRightItem = (id: string) => {
        const item = rightOptions.find((opt) => opt.id === id);
        if (item) {
            setEditingRightItemId(id);
            setEditorContent(item.text);
            setEditingLeftItemId(null);
            setIsCreatingNewLeftItem(false);
            setIsCreatingNewRightItem(false);
        }
    };

    const removeLeftItem = (id: string) => {
        onChange({
            ...value,
            options: options.filter((opt) => opt.id !== id),
        });
    };

    const removeRightItem = (id: string) => {
        onChange({
            ...value,
            options: options
                .filter((opt) => opt.id !== id)
                .map((opt) => {
                    if (opt.isLeft && opt.matchPairIds?.includes(id)) {
                        return {
                            ...opt,
                            matchPairIds: opt.matchPairIds.filter((pairId) => pairId !== id),
                        };
                    }
                    return opt;
                }),
        });
    };
    const handleDragStart = (
        e: React.DragEvent,
        item: { type: "left" | "right"; id: string; index: number }
    ) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", "");
        dragCounter.current = 0;
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverTarget(targetId);
    };

    const handleDragEnter = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        dragCounter.current++;
        setDragOverTarget(targetId);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setDragOverTarget(null);
        }
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        dragCounter.current = 0;
        setDragOverTarget(null);

        if (!draggedItem) return;

        if (draggedItem.type === "right") {
            onChange({
                ...value,
                options: options.map((opt) => {
                    if (opt.id === targetId && opt.isLeft) {
                        const existingMatches = opt.matchPairIds ?? [];
                        if (existingMatches.includes(draggedItem.id)) {
                            return opt;
                        }
                        return {
                            ...opt,
                            matchPairIds: [...existingMatches, draggedItem.id],
                        };
                    }
                    return opt;
                }),
            });
        }
        setDraggedItem(null);
    };
    const removeMatch = (leftId: string, rightIdToRemove: string) => {
        onChange({
            ...value,
            options: options.map((opt) => {
                if (opt.id === leftId && opt.isLeft) {
                    return {
                        ...opt,
                        matchPairIds: (opt.matchPairIds ?? []).filter(
                            (id) => id !== rightIdToRemove
                        ),
                    };
                }
                return opt;
            }),
        });
    };
    const getMatchedRightOptions = (leftId: string) => {
        const leftOption = options.find((opt) => opt.id === leftId);
        const matchedIds = leftOption?.matchPairIds ?? [];
        return rightOptions.filter((opt) => matchedIds.includes(opt.id));
    };

    const isRightItemUsed = (rightItemId: string): boolean => {
        return leftOptions.some((left) => left.matchPairIds?.includes(rightItemId));
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Question
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <TiptapEditor
                        initialContent={value.question || ""}
                        onUpdate={handleQuestionChange}
                    />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <GripVertical className="h-5 w-5 text-primary" />
                                Left Items
                            </CardTitle>
                            <Button onClick={addLeftItem} size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Add
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {leftOptions.map((item, index) => {
                            const matchedRights = getMatchedRightOptions(item.id);

                            return (
                                <div
                                    key={item.id}
                                    className={`border rounded-lg p-4 ${
                                        dragOverTarget === item.id && draggedItem?.type === "right"
                                            ? "border-primary border-2 bg-primary/10"
                                            : ""
                                    }`}
                                    onDragOver={(e) => handleDragOver(e, item.id)}
                                    onDragEnter={(e) => handleDragEnter(e, item.id)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, item.id)}
                                >
                                    {editingLeftItemId === item.id ? (
                                        <div className="space-y-2">
                                            <div className="flex items-start justify-between mb-3">
                                                <Label className="text-sm font-medium">
                                                    Edit Left Item {index + 1}
                                                </Label>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={handleSaveItem}
                                                        disabled={!editorContent.trim()}
                                                    >
                                                        <Save className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={handleCancelEdit}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <TiptapEditor
                                                key={`edit-left-${item.id}`}
                                                initialContent={editorContent}
                                                onUpdate={setEditorContent}
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-start justify-between mb-3">
                                                <Label className="text-sm font-medium">
                                                    Left Item {index + 1}
                                                </Label>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleEditLeftItem(item.id)}
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => removeLeftItem(item.id)}
                                                        className="hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div
                                                className="prose prose-sm dark:prose-invert"
                                                dangerouslySetInnerHTML={{ __html: item.text }}
                                            />
                                            {matchedRights.length > 0 && (
                                                <div className="mt-3 pt-3 border-t">
                                                    <Label className="text-xs text-muted-foreground mb-2 block">
                                                        Matched with:
                                                    </Label>
                                                    <div className="space-y-2">
                                                        {matchedRights.map((matchedRight) => (
                                                            <div
                                                                key={matchedRight.id}
                                                                className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/40 rounded border border-green-200 dark:border-green-700"
                                                            >
                                                                <div
                                                                    className="prose prose-xs dark:prose-invert flex-1"
                                                                    dangerouslySetInnerHTML={{
                                                                        __html: matchedRight.text,
                                                                    }}
                                                                />
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() =>
                                                                        removeMatch(
                                                                            item.id,
                                                                            matchedRight.id
                                                                        )
                                                                    }
                                                                    className="ml-2"
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}

                        {isCreatingNewLeftItem && (
                            <div className="border-2 border-dashed rounded-lg p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <Label className="text-sm font-medium">
                                        Left Item {leftOptions.length + 1}
                                    </Label>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={handleSaveItem}
                                            disabled={!editorContent.trim()}
                                        >
                                            <Save className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCancelEdit}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <TiptapEditor
                                    key="create-left"
                                    initialContent=""
                                    onUpdate={setEditorContent}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right Items Column */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <GripVertical className="h-5 w-5 text-primary" />
                                Right Items
                            </CardTitle>
                            <Button onClick={addRightItem} size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Add
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {rightOptions.map((item, index) => (
                            <div
                                key={item.id}
                                className={`border rounded-lg p-4 cursor-move ${
                                    isRightItemUsed(item.id)
                                        ? "bg-green-50 dark:bg-green-900/40 border-green-500 dark:border-green-600"
                                        : "hover:border-primary"
                                }`}
                                draggable
                                onDragStart={(e) =>
                                    handleDragStart(e, {
                                        type: "right",
                                        id: item.id,
                                        index,
                                    })
                                }
                            >
                                {editingRightItemId === item.id ? (
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between mb-3">
                                            <Label className="text-sm font-medium">
                                                Edit Right Item {index + 1}
                                            </Label>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={handleSaveItem}
                                                    disabled={!editorContent.trim()}
                                                >
                                                    <Save className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleCancelEdit}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <TiptapEditor
                                            key={`edit-right-${item.id}`}
                                            initialContent={editorContent}
                                            onUpdate={setEditorContent}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-start justify-between mb-3">
                                            <Label className="text-sm font-medium flex items-center gap-2">
                                                <GripVertical className="h-4 w-4" />
                                                Right Item {index + 1}
                                                {isRightItemUsed(item.id) && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Matched
                                                    </Badge>
                                                )}
                                            </Label>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleEditRightItem(item.id)}
                                                >
                                                    <Edit3 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => removeRightItem(item.id)}
                                                    className="hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div
                                            className="prose prose-sm dark:prose-invert"
                                            dangerouslySetInnerHTML={{ __html: item.text }}
                                        />
                                    </>
                                )}
                            </div>
                        ))}

                        {isCreatingNewRightItem && (
                            <div className="border-2 border-dashed rounded-lg p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <Label className="text-sm font-medium">
                                        Right Item {rightOptions.length + 1}
                                    </Label>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={handleSaveItem}
                                            disabled={!editorContent.trim()}
                                        >
                                            <Save className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCancelEdit}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <TiptapEditor
                                    key="create-right"
                                    initialContent=""
                                    onUpdate={setEditorContent}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="text-sm text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-lg">
                <p className="font-medium">Instructions:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>Drag right items onto left items to create matches</li>
                    <li>Each left item can match with multiple right items</li>
                    <li>Matched right items will show a green background</li>
                    <li>Left items will display their matched right items below</li>
                </ul>
            </div>
        </div>
    );
}
