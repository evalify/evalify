"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import type { Collection } from "@tanstack/db";
import type { QuizMetadata } from "../lib/types";

const CHECK_INTERVAL_MS = 1_000;
const WARNING_THRESHOLD_MS = 2 * 60 * 1_000;

export function useAutoSubmit(
    metadataCollection: Collection<QuizMetadata, string, never, never, QuizMetadata>,
    submitQuizFn: () => Promise<void>
) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isWarning, setIsWarning] = useState(false);
    const submittingRef = useRef(false);

    const { data: metadataList = [] } = useLiveQuery((q) =>
        q.from({ meta: metadataCollection }).select(({ meta }) => meta)
    );

    const metadata = metadataList[0];

    const handleAutoSubmit = useCallback(async () => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setIsSubmitting(true);

        try {
            metadataCollection.update(metadata!.quizId, (draft) => {
                draft.submissionStatus = "AUTO_SUBMITTED";
            });
            await submitQuizFn();
        } catch {
            submittingRef.current = false;
            setIsSubmitting(false);
        }
    }, [metadata, metadataCollection, submitQuizFn]);

    useEffect(() => {
        if (!metadata?.endTime || metadata.submissionStatus !== "NOT_SUBMITTED") {
            return;
        }

        const endTime = metadata.endTime;

        const checkExpiry = () => {
            if (submittingRef.current) return;

            const now = Date.now();
            const remaining = endTime - now;

            if (remaining <= 0) {
                handleAutoSubmit();
                return;
            }

            if (remaining <= WARNING_THRESHOLD_MS && !isWarning) {
                setIsWarning(true);
            }
        };

        checkExpiry();
        const interval = setInterval(checkExpiry, CHECK_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [metadata, handleAutoSubmit, isWarning]);

    const [remainingMs, setRemainingMs] = useState<number | null>(null);

    useEffect(() => {
        if (!metadata?.endTime) return;
        const endTime = metadata.endTime;
        const update = () => setRemainingMs(Math.max(0, endTime - Date.now()));
        update();
        const id = setInterval(update, CHECK_INTERVAL_MS);
        return () => clearInterval(id);
    }, [metadata?.endTime]);

    return {
        isAutoSubmitting: isSubmitting,
        isWarning,
        submissionStatus: metadata?.submissionStatus ?? "NOT_SUBMITTED",
        remainingMs: metadata?.endTime ? remainingMs : null,
    };
}
