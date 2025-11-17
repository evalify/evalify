"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
    /** quiz end time as ISO string or Date */
    endTime?: string | Date | null;
    /** optional start time and duration (ms) fallback */
    startTime?: string | Date | null;
    durationMs?: number | null;
    onExpire?: () => void;
};

function formatMs(ms: number) {
    if (ms <= 0) return "00:00";
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
        if (endTime) return new Date(endTime);
        if (startTime && durationMs) return new Date(new Date(startTime).getTime() + durationMs);
        return null;
    }, [endTime, startTime, durationMs]);

    const [mounted, setMounted] = useState(false);
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        // mark mounted and initialize "now" only on client to avoid SSR/client mismatch
        queueMicrotask(() => {
            setMounted(true);
            setNow(new Date());
        });
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const remainingMs = computeEnd && now ? computeEnd.getTime() - now.getTime() : null;

    useEffect(() => {
        if (mounted && remainingMs !== null && remainingMs <= 0) {
            onExpire?.();
        }
    }, [mounted, remainingMs, onExpire]);

    return (
        <Card className="w-full">
            <CardContent>
                <div className="text-center">
                    <div className="text-2xl font-mono font-semibold">
                        {mounted && remainingMs !== null
                            ? formatMs(Math.max(0, remainingMs))
                            : "--:--"}
                    </div>
                    {mounted && computeEnd ? (
                        <div className="text-xs text-muted-foreground mt-1">
                            Ends at {computeEnd.toLocaleTimeString()}
                        </div>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
}
