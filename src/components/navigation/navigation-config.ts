/**
 * Shared navigation configuration for breadcrumbs and navigation context.
 * This is the single source of truth for all navigation labels and dynamic segments.
 */

export interface NavigationConfig {
    [key: string]: {
        label: string;
        parent?: string;
        dynamicSegments?: {
            [key: string]: string; // segment pattern -> label
        };
    };
}

export const defaultNavigationConfig: NavigationConfig = {
    "/": { label: "Home" },
    "/dashboard": { label: "Dashboard" },
    "/course": {
        label: "Courses",
        dynamicSegments: {
            uuid: "Course",
            "[id]/quiz": "Quiz",
            "[id]/quiz/[quizId]": "Quiz Details",
            "[id]/quiz/[quizId]/manage": "Manage Quiz",
            "[id]/quiz/[quizId]/question": "Add/Edit Questions",
            "[id]/quiz/[quizId]/result": "Quiz Results",
            "[id]/quiz/[quizId]/view": "Quiz Questions",
        },
    },
    "/question-bank": {
        label: "Question Bank",
        dynamicSegments: {
            uuid: "Bank Questions",
        },
    },
    "/student-results": { label: "Results" },
    "/quiz": { label: "Quiz" },
    "/user": {
        label: "Users",
        dynamicSegments: {
            "uuid id": "User Details",
        },
    },
    "/batch": {
        label: "Batches",
        dynamicSegments: {
            uuid: "Batch Details",
        },
    },
    "/semester": {
        label: "Semester",
        dynamicSegments: {
            uuid: "Semester Details",
        },
    },
    "/department": {
        label: "Departments",
        dynamicSegments: {
            uuid: "Department Details",
        },
    },
    "/lab": {
        label: "Labs",
        dynamicSegments: {
            uuid: "Lab Details",
        },
    },
    "/settings": { label: "Settings" },
};
