"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import type { Collection } from "@tanstack/db";
import type { QuizMetadata } from "../lib/types";
import { trpc } from "@/lib/trpc/client";

const CHECK_INTERVAL_MS = 1_000;
/** How often to poll the server for auto-submit status (30 seconds) */
const SERVER_POLL_INTERVAL_MS = 30_000;
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

    // Server-side auto-submit detection via polling
    const checkAutoSubmitMutation = trpc.exam.checkAutoSubmitStatus.useMutation();
    const checkAutoSubmitRef = useRef(checkAutoSubmitMutation);
    useEffect(() => {
        checkAutoSubmitRef.current = checkAutoSubmitMutation;
    }, [checkAutoSubmitMutation]);

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
            // If client-side submit fails (e.g., server already submitted), that's okay
            // The server poll will detect the actual status
            submittingRef.current = false;
            setIsSubmitting(false);
        }
    }, [metadata, metadataCollection, submitQuizFn]);

    /**
     * Mark the quiz as auto-submitted in the local collection
     * (used when the server has already auto-submitted via cron job)
     */
    const handleServerAutoSubmitted = useCallback(() => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setIsSubmitting(true);

        if (metadata) {
            metadataCollection.update(metadata.quizId, (draft) => {
                draft.submissionStatus = "AUTO_SUBMITTED";
            });
        }
    }, [metadata, metadataCollection]);

    // Client-side timer check
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

    // Server-side auto-submit polling
    // Poll the server periodically to detect if the cron job has already auto-submitted
    useEffect(() => {
        if (!metadata || metadata.submissionStatus !== "NOT_SUBMITTED") {
            return;
        }

        const quizId = metadata.quizId;

        const pollServer = async () => {
            if (submittingRef.current) return;

            try {
                const result = await checkAutoSubmitRef.current.mutateAsync({ quizId });
                if (result.autoSubmitted) {
                    handleServerAutoSubmitted();
                }
            } catch {
                // Silently ignore poll errors — will retry on next interval
            }
        };

        const interval = setInterval(pollServer, SERVER_POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [metadata, handleServerAutoSubmitted]);

    // Check on initial load if already submitted by server
    useEffect(() => {
        if (
            metadata?.submissionStatus === "SUBMITTED" ||
            metadata?.submissionStatus === "AUTO_SUBMITTED"
        ) {
            if (!submittingRef.current) {
                submittingRef.current = true;
                queueMicrotask(() => {
                    setIsSubmitting(true);
                });
            }
        }
    }, [metadata?.submissionStatus]);

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
