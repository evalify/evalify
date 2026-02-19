"use client";

import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { QuizQuestion } from "../context/quiz-context";
import { ContentPreview } from "@/components/rich-text-editor/content-preview";
import { QuestionHeader } from "./question-header";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, GripVertical, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MatchingStudentAnswer } from "../lib/types";
import type { MatchOptions } from "@/types/questions";

/* ─── helpers ───────────────────────────────────────────────────────────── */

/**
 * Normalise whatever shape the DB returns into `Record<string, string[]>`.
 *
 * Legacy rows store `Record<string, string>` (single-match era).
 * New rows store `Record<string, string[]>` (multi-match).
 * This function gracefully handles both so `.map()` never blows up on a
 * plain string.
 */
function normaliseMatches(raw: unknown): Record<string, string[]> {
    if (!raw || typeof raw !== "object") return {};

    const out: Record<string, string[]> = {};
    for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
        if (Array.isArray(val)) {
            out[key] = val.filter((v): v is string => typeof v === "string");
        } else if (typeof val === "string" && val) {
            // Legacy single-match shape → wrap in array
            out[key] = [val];
        }
        // skip nulls / other junk gracefully
    }
    return out;
}

/* ─── component ─────────────────────────────────────────────────────────── */

interface MatchTheFollowingQuestionProps {
    question: QuizQuestion;
    onAnswerChange: (answer: MatchingStudentAnswer) => void;
}

/**
 * Student-side Match-the-Following with native HTML5 drag-and-drop.
 *
 * • Column B items are draggable via the grip handle.
 * • Column A rows are drop zones — each can hold **multiple** right items.
 * • Dropping a right item that is already matched elsewhere moves it.
 * • Click × on a matched tag to remove that single link.
 *
 * Answer shape persisted: `{ studentAnswer: Record<leftId, rightId[]> }`
 */
export function MatchTheFollowingQuestion({
    question,
    onAnswerChange,
}: MatchTheFollowingQuestionProps) {
    /* ── derive left / right option lists ─────────────────────────────────── */

    const allOptions = useMemo<MatchOptions[]>(() => question.options || [], [question.options]);

    const leftOptions = useMemo(
        () =>
            allOptions
                .filter((o) => o.isLeft)
                .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
        [allOptions]
    );

    const rightOptions = useMemo(
        () =>
            allOptions
                .filter((o) => !o.isLeft)
                .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
        [allOptions]
    );

    /* ── local match state (normalised from DB on init & question change) ── */

    const readSaved = useCallback((): Record<string, string[]> => {
        const raw = (question.response as MatchingStudentAnswer | undefined)?.studentAnswer;
        return normaliseMatches(raw);
    }, [question.response]);

    const [prevQuestionId, setPrevQuestionId] = useState(question.id);
    const [matches, setMatches] = useState<Record<string, string[]>>(readSaved);

    // React-recommended pattern: adjust state during render when props change
    // (avoids useEffect + setState cascading render lint warning)
    if (question.id !== prevQuestionId) {
        setPrevQuestionId(question.id);
        setMatches(readSaved());
    }

    const persist = useCallback(
        (next: Record<string, string[]>) => {
            onAnswerChange({ studentAnswer: next });
        },
        [onAnswerChange]
    );

    // Flag: true when the most recent setMatches came from a drag/click (user
    // action). False for question-navigation resets. Used to gate the persist
    // effect so we don't re-save when the student merely navigates.
    const userActionRef = useRef(false);

    // Persist after React finishes the state update — runs outside the render
    // cycle, so calling onAnswerChange (which updates the parent) is safe.
    useEffect(() => {
        if (userActionRef.current) {
            userActionRef.current = false;
            persist(matches);
        }
    }, [matches, persist]);

    /* ── drag state ───────────────────────────────────────────────────────── */

    const [draggedRightId, setDraggedRightId] = useState<string | null>(null);
    const [dragOverLeftId, setDragOverLeftId] = useState<string | null>(null);
    // Counter per drop-zone to avoid the leave-child / enter-parent flicker
    const enterCountRef = useRef<Record<string, number>>({});

    /* ── match query helpers ──────────────────────────────────────────────── */

    /** Right IDs matched to a left item. Always returns an array (never a string). */
    const rightIdsForLeft = useCallback(
        (leftId: string): string[] => {
            const val = matches[leftId];
            // Extra safety: normalise at read-time in case state was seeded with legacy data
            if (Array.isArray(val)) return val;
            if (typeof val === "string" && val) return [val];
            return [];
        },
        [matches]
    );

    /** Which left item (if any) currently holds a given right item. */
    const leftIdForRight = useCallback(
        (rightId: string): string | undefined => {
            for (const [leftId, rIds] of Object.entries(matches)) {
                const arr = Array.isArray(rIds) ? rIds : [rIds];
                if (arr.includes(rightId)) return leftId;
            }
            return undefined;
        },
        [matches]
    );

    /* ── match mutation helpers ───────────────────────────────────────────── */

    /**
     * Remove a single right item from a left slot.
     * Sets the user-action flag so the effect above will persist the change.
     */
    const removeMatch = useCallback((leftId: string, rightId: string) => {
        userActionRef.current = true;
        setMatches((prev) => {
            const next = { ...prev };
            const raw = next[leftId];
            const arr = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(
                (id) => id !== rightId
            );
            if (arr.length === 0) delete next[leftId];
            else next[leftId] = arr;
            return next;
        });
    }, []);

    /**
     * Add a right item to a left slot (removing it from any previous slot first).
     * Sets the user-action flag so the effect above will persist the change.
     */
    const addMatch = useCallback((leftId: string, rightId: string) => {
        userActionRef.current = true;
        setMatches((prev) => {
            const next = { ...prev };

            // Remove from any previous left
            for (const [lId, rIds] of Object.entries(next)) {
                const arr = Array.isArray(rIds) ? rIds : rIds ? [rIds] : [];
                if (arr.includes(rightId)) {
                    const filtered = arr.filter((id) => id !== rightId);
                    if (filtered.length === 0) delete next[lId];
                    else next[lId] = filtered;
                    break;
                }
            }

            // Append to target left (skip duplicates)
            const existing = Array.isArray(next[leftId])
                ? next[leftId]
                : next[leftId]
                  ? [next[leftId] as unknown as string]
                  : [];
            if (!existing.includes(rightId)) {
                next[leftId] = [...existing, rightId];
            }

            return next;
        });
    }, []);

    /* ── native HTML5 drag handlers ───────────────────────────────────────── */

    const onDragStart = (e: React.DragEvent, rightId: string) => {
        setDraggedRightId(rightId);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", rightId);
    };

    const onDragEnd = () => {
        setDraggedRightId(null);
        setDragOverLeftId(null);
        enterCountRef.current = {};
    };

    const onZoneDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const onZoneDragEnter = (e: React.DragEvent, leftId: string) => {
        e.preventDefault();
        enterCountRef.current[leftId] = (enterCountRef.current[leftId] ?? 0) + 1;
        setDragOverLeftId(leftId);
    };

    const onZoneDragLeave = (e: React.DragEvent, leftId: string) => {
        e.preventDefault();
        enterCountRef.current[leftId] = (enterCountRef.current[leftId] ?? 1) - 1;
        if (enterCountRef.current[leftId] <= 0) {
            enterCountRef.current[leftId] = 0;
            setDragOverLeftId((prev) => (prev === leftId ? null : prev));
        }
    };

    const onZoneDrop = (e: React.DragEvent, leftId: string) => {
        e.preventDefault();
        enterCountRef.current[leftId] = 0;
        setDragOverLeftId(null);

        const rightId = draggedRightId ?? e.dataTransfer.getData("text/plain");
        if (rightId) addMatch(leftId, rightId);
        setDraggedRightId(null);
    };

    /* ── render ───────────────────────────────────────────────────────────── */

    return (
        <div className="space-y-6">
            <QuestionHeader question={question} />

            <div className="prose prose-sm max-w-none dark:prose-invert">
                <ContentPreview content={(question.question as string) || ""} />
            </div>

            <p className="text-xs text-muted-foreground">
                Drag items from <span className="font-semibold">Column B</span> and drop them onto
                the matching row in <span className="font-semibold">Column A</span>. Each row can
                accept multiple items.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ── Column A — drop targets ──────────────────────────── */}
                <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Column A
                    </h4>

                    {leftOptions.map((left, idx) => {
                        const rIds = rightIdsForLeft(left.id);
                        const matchedRights = rIds
                            .map((rid) => rightOptions.find((r) => r.id === rid))
                            .filter(Boolean) as MatchOptions[];
                        const hasMatch = matchedRights.length > 0;
                        const isDragOver = dragOverLeftId === left.id;
                        const isDragging = draggedRightId !== null;

                        return (
                            <div
                                key={left.id}
                                className={cn(
                                    "rounded-lg border p-3 transition-all duration-150",
                                    isDragOver
                                        ? "border-primary border-2 bg-primary/5 ring-2 ring-primary/20"
                                        : hasMatch
                                          ? "border-green-400 dark:border-green-600 bg-green-50/50 dark:bg-green-950/20"
                                          : isDragging
                                            ? "border-dashed border-muted-foreground/50 bg-muted/30"
                                            : "border-border"
                                )}
                                onDragOver={onZoneDragOver}
                                onDragEnter={(e) => onZoneDragEnter(e, left.id)}
                                onDragLeave={(e) => onZoneDragLeave(e, left.id)}
                                onDrop={(e) => onZoneDrop(e, left.id)}
                            >
                                {/* left item label */}
                                <div className="flex items-start gap-2 mb-2">
                                    <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold">
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0 text-sm">
                                        <ContentPreview
                                            content={left.text}
                                            noProse
                                            className="p-0 border-0"
                                        />
                                    </div>
                                </div>

                                {/* matched right items (or placeholder) */}
                                {hasMatch ? (
                                    <div className="flex flex-col gap-1.5 mt-1 pl-7">
                                        {matchedRights.map((mr) => (
                                            <div key={mr.id} className="flex items-center gap-1.5">
                                                <Link2 className="h-3 w-3 shrink-0 text-green-500" />
                                                <span className="text-xs text-green-700 dark:text-green-400 flex-1 min-w-0 truncate">
                                                    <ContentPreview
                                                        content={mr.text}
                                                        noProse
                                                        className="p-0 border-0 inline"
                                                    />
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 w-5 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => removeMatch(left.id, mr.id)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div
                                        className={cn(
                                            "mt-1 pl-7 text-[11px] text-muted-foreground/60 italic",
                                            isDragOver && "text-primary"
                                        )}
                                    >
                                        {isDragOver ? "Release to match" : "Drop item(s) here…"}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ── Column B — draggable items ───────────────────────── */}
                <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Column B <span className="font-normal normal-case">(drag to match)</span>
                    </h4>

                    {rightOptions.map((right, idx) => {
                        const matched = !!leftIdForRight(right.id);
                        const isDragging = draggedRightId === right.id;

                        return (
                            <div
                                key={right.id}
                                draggable
                                onDragStart={(e) => onDragStart(e, right.id)}
                                onDragEnd={onDragEnd}
                                className={cn(
                                    "flex items-start gap-2 rounded-lg border p-3",
                                    "cursor-grab active:cursor-grabbing select-none",
                                    "transition-all duration-150",
                                    isDragging
                                        ? "opacity-40 scale-95 border-dashed"
                                        : matched
                                          ? "border-green-400 dark:border-green-600 bg-green-50/50 dark:bg-green-950/20"
                                          : "border-border hover:border-primary/50 hover:bg-muted/30"
                                )}
                            >
                                <GripVertical className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/50" />
                                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold">
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                <div className="flex-1 min-w-0 text-sm">
                                    <ContentPreview
                                        content={right.text}
                                        noProse
                                        className="p-0 border-0"
                                    />
                                </div>
                                {matched && (
                                    <Badge
                                        variant="outline"
                                        className="shrink-0 text-[10px] border-green-400 text-green-600 dark:text-green-400"
                                    >
                                        Matched
                                    </Badge>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
