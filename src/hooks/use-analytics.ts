"use client";

import { useEffect, useRef, useCallback } from "react";
import posthog from "posthog-js";

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export const useAnalytics = () => {
    const isInitialized = useRef(false);

    useEffect(() => {
        if (typeof window !== "undefined" && !isInitialized.current) {
            posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
                api_host: "/ingest",
                ui_host: "https://us.posthog.com",
                capture_pageview: true,
                capture_pageleave: true,
            });
            isInitialized.current = true;
        }
    }, []);

    const track = useCallback((event: string, properties?: AnalyticsProperties) => {
        if (isInitialized.current) {
            posthog.capture(event, properties);
        }
    }, []);

    const identify = useCallback((userId: string, properties?: AnalyticsProperties) => {
        if (isInitialized.current) {
            posthog.identify(userId, properties);
        }
    }, []);

    return { track, identify };
};
