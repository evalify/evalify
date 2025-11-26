/**
 * Hook for handling auto-submission logic
 *
 * This hook uses TanStack DB to reactively monitor the quiz end time
 * and automatically triggers submission when the time expires.
 *
 * @module features/exam/hooks
 */

"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import type { Collection } from "@tanstack/db";
import type { QuizMetadata } from "../lib/types";
import { useRouter } from "next/navigation";

/**
 * Hook to handle auto-submission
 *
 * @param metadataCollection - The quiz metadata collection
 * @param submitQuizFn - Function to submit the quiz to server
 */
export function useAutoSubmit(
    metadataCollection: Collection<QuizMetadata, string, never, never, QuizMetadata>,
    submitQuizFn: () => Promise<void>
) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reactively get metadata
    const { data: metadataList = [] } = useLiveQuery((q) =>
        q.from({ meta: metadataCollection }).select(({ meta }) => meta)
    );

    const metadata = metadataList[0];

    // Check for expiry every second
    useEffect(() => {
        if (!metadata || !metadata.endTime || metadata.submissionStatus !== "NOT_SUBMITTED") {
            return;
        }

        const checkExpiry = async () => {
            const now = Date.now();
            const endTime = metadata.endTime!; // We checked it exists above

            // If time expired
            if (now >= endTime) {
                // Prevent double submission
                if (isSubmitting) return;

                console.log("[AutoSubmit] Time expired, submitting quiz...");
                setIsSubmitting(true);

                try {
                    // 1. Update local status first (optimistic)
                    metadataCollection.update(metadata.quizId, (draft) => {
                        draft.submissionStatus = "AUTO_SUBMITTED";
                    });

                    // 2. Trigger server submission
                    await submitQuizFn();

                    // 3. Redirect
                    router.push(`/quiz/${metadata.quizId}/submitted`);
                } catch (error) {
                    console.error("[AutoSubmit] Error submitting quiz:", error);
                    setIsSubmitting(false);
                    // Rollback local status if needed, but usually we want to keep trying
                }
            }
        };

        // Check immediately
        checkExpiry();

        // Check every second
        const interval = setInterval(checkExpiry, 1000);
        return () => clearInterval(interval);
    }, [metadata, metadataCollection, submitQuizFn, router, isSubmitting]);

    return {
        isAutoSubmitting: isSubmitting,
        submissionStatus: metadata?.submissionStatus ?? "NOT_SUBMITTED",
    };
}
