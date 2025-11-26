/**
 * Exam Utility Functions
 *
 * Provides helper functions for exam-related functionality
 */

import { useRef, useEffect, useMemo } from "react";

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced version of the function
 *
 * @example
 * ```ts
 * const debouncedSave = debounce((value: string) => {
 *   saveToServer(value);
 * }, 500);
 *
 * // Will only call saveToServer once, 500ms after the last call
 * debouncedSave('a');
 * debouncedSave('ab');
 * debouncedSave('abc');
 * ```
 */
export function debounce<TArgs extends unknown[]>(
    func: (...args: TArgs) => void,
    wait: number
): (...args: TArgs) => void {
    let timeoutId: NodeJS.Timeout | null = null;

    return function debounced(...args: TArgs) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            func(...args);
            timeoutId = null;
        }, wait);
    };
}

/**
 * Creates a debounced function with a cancel method
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced function with a cancel method
 */
export function debounceWithCancel<TArgs extends unknown[]>(
    func: (...args: TArgs) => void,
    wait: number
): ((...args: TArgs) => void) & { cancel: () => void } {
    let timeoutId: NodeJS.Timeout | null = null;

    const debounced = function (...args: TArgs) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            func(...args);
            timeoutId = null;
        }, wait);
    };

    debounced.cancel = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    return debounced;
}

/**
 * React hook for creating a stable debounced callback
 *
 * This hook ensures the debounced function maintains the same reference across renders,
 * which is critical for debouncing to work correctly in React components.
 *
 * @param callback - The function to debounce
 * @param delay - The number of milliseconds to delay
 * @returns A stable debounced callback function
 *
 * @example
 * ```tsx
 * const debouncedSave = useDebounceCallback(
 *   (value: string) => saveToServer(value),
 *   500
 * );
 *
 * // In your component
 * <input onChange={(e) => debouncedSave(e.target.value)} />
 * ```
 */
export function useDebounceCallback<TArgs extends unknown[]>(
    callback: (...args: TArgs) => void,
    delay: number
): (...args: TArgs) => void {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const callbackRef = useRef(callback);

    // Update callback ref when callback changes
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Return stable debounced function using useMemo
    return useMemo(
        () =>
            (...args: TArgs) => {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }

                timeoutRef.current = setTimeout(() => {
                    callbackRef.current(...args);
                }, delay);
            },
        [delay]
    );
}
