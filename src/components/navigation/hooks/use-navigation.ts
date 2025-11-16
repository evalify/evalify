"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import { NavigationConfig, defaultNavigationConfig } from "../navigation-config";

export interface BreadcrumbSegment {
    label: string;
    href: string;
    isCurrentPage?: boolean;
    isDynamicSegment?: boolean; // New property to identify dynamic segments
}

// Helper functions
const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

const isNumericId = (str: string): boolean => {
    return /^\d+$/.test(str);
};

export function useNavigation(customConfig?: NavigationConfig) {
    const router = useRouter();
    const pathname = usePathname();

    const navigationConfig = useMemo(
        () => ({
            ...defaultNavigationConfig,
            ...customConfig,
        }),
        [customConfig]
    );

    // Check if we can go back or forward
    const canGoBack = typeof window !== "undefined" && window.history.length > 1;
    const canGoForward = false; // No reliable way to detect forward navigation

    const goBack = useCallback(() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
        }
    }, [router]);

    const goForward = useCallback(() => {
        router.forward();
    }, [router]);

    const navigateTo = useCallback(
        (path: string) => {
            router.push(path);
        },
        [router]
    );

    const generateBreadcrumbs = useCallback((): BreadcrumbSegment[] => {
        const segments = pathname.split("/").filter(Boolean);
        const breadcrumbs: BreadcrumbSegment[] = [];

        // Always add home/dashboard as first breadcrumb if not on root
        if (pathname !== "/" && !pathname.startsWith("/dashboard")) {
            breadcrumbs.push({
                label: "Dashboard",
                href: "/dashboard",
                isDynamicSegment: false,
            });
        }

        let currentPath = "";
        let parentPath = "";

        segments.forEach((segment, index) => {
            currentPath += `/${segment}`;
            const isLastSegment = index === segments.length - 1;
            let isDynamicSegment = false;
            let linkHref = currentPath; // Default to current path

            // Check if we have a custom label for this exact path
            const config = navigationConfig[currentPath];
            let label = config?.label;

            // If no exact match, check if this might be a dynamic segment
            if (!label) {
                // Check if the parent path has dynamic segment configuration
                const parentConfig = navigationConfig[parentPath];

                if (parentConfig?.dynamicSegments) {
                    // Check if this segment matches any dynamic pattern
                    if (isUUID(segment)) {
                        label = parentConfig.dynamicSegments["uuid"];
                        isDynamicSegment = true;
                        linkHref = parentPath || "/dashboard"; // Fallback to dashboard if no parent
                    } else if (isNumericId(segment)) {
                        label = parentConfig.dynamicSegments["id"];
                        isDynamicSegment = true;
                        linkHref = parentPath || "/dashboard"; // Fallback to dashboard if no parent
                    } else if (parentConfig.dynamicSegments[segment]) {
                        label = parentConfig.dynamicSegments[segment];
                        isDynamicSegment = true;
                        linkHref = parentPath || "/dashboard"; // Fallback to dashboard if no parent
                    }
                }
            }

            // If still no label, try to generate one from the segment
            if (!label) {
                // Handle dynamic routes (e.g., [id])
                if (segment.match(/^\[.*\]$/)) {
                    label = "Details";
                    isDynamicSegment = true;
                    linkHref = parentPath || "/dashboard"; // Fallback to dashboard if no parent
                } else if (isUUID(segment)) {
                    // For UUID segments without specific config, use generic label
                    label = "Details";
                    isDynamicSegment = true;
                    linkHref = parentPath || "/dashboard"; // Fallback to dashboard if no parent
                } else {
                    // Capitalize and format the segment
                    label = segment
                        .split("-")
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ");
                }
            }

            breadcrumbs.push({
                label,
                href: linkHref,
                isCurrentPage: isLastSegment,
                isDynamicSegment,
            });

            parentPath = currentPath;
        });

        return breadcrumbs;
    }, [pathname, navigationConfig]);

    const breadcrumbs = useMemo(() => generateBreadcrumbs(), [generateBreadcrumbs]);

    return {
        goBack,
        goForward,
        navigateTo,
        breadcrumbs,
        currentPath: pathname,
        canGoBack,
        canGoForward,
    };
}
