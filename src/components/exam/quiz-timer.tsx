"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
    endTime?: string | Date | null;
    startTime?: string | Date | null;
    durationMs?: number | null;
    onExpire?: () => void;
};

const WARNING_THRESHOLD_MS = 2 * 60 * 1_000;

function formatMs(ms: number) {
    if (!Number.isFinite(ms) || ms <= 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0)
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function QuizTimer({ endTime, startTime, durationMs, onExpire }: Props) {
    const computeEnd = useMemo(() => {
        if (endTime) {
            const d = new Date(endTime);
            if (Number.isNaN(d.getTime())) return null;
            return d;
        }
        if (startTime && durationMs) {
            const start = new Date(startTime);
            if (Number.isNaN(start.getTime())) return null;
            return new Date(start.getTime() + durationMs);
        }
        return null;
    }, [endTime, startTime, durationMs]);

    const [remainingMs, setRemainingMs] = useState<number | null>(null);
    const hasFiredRef = useRef(false);

    useEffect(() => {
        hasFiredRef.current = false;
        if (!computeEnd) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setRemainingMs(null);
            return;
        }

        const endMs = computeEnd.getTime();
        const update = () => {
            const ms = endMs - Date.now();

            setRemainingMs(Math.max(0, ms));

            if (ms <= 0 && !hasFiredRef.current) {
                hasFiredRef.current = true;
                onExpire?.();
            }
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [computeEnd, onExpire]);

    const isWarning =
        remainingMs !== null && remainingMs > 0 && remainingMs <= WARNING_THRESHOLD_MS;

    return (
        <Card className="w-full">
            <CardContent className="flex flex-col items-center justify-center py-4">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Time Remaining
                </div>
                <div
                    className={cn(
                        "text-3xl font-mono font-bold tabular-nums",
                        isWarning && "text-destructive animate-pulse"
                    )}
                >
                    {remainingMs !== null ? formatMs(Math.max(0, remainingMs)) : "--:--"}
                </div>
            </CardContent>
        </Card>
    );
}
