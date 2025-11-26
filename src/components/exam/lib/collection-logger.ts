/**
 * Collection Logger Utilities
 *
 * Development-only utilities for logging TanStack DB collection data to the console.
 * Provides formatted output for better readability and debugging.
 */

import type { QuestionResponse, QuestionState, QuestionItem, StudentAnswer } from "./types";

/**
 * Log all items in a collection with formatted output
 */
function logCollection<T>(
    collectionName: string,
    items: T[],
    options: {
        expanded?: boolean;
        maxItems?: number;
    } = {}
) {
    const { expanded = false, maxItems = 50 } = options;

    console.group(`📊 ${collectionName} Collection (${items.length} items)`);

    if (items.length === 0) {
        console.log("  (empty)");
    } else {
        const itemsToShow = items.slice(0, maxItems);

        if (expanded) {
            itemsToShow.forEach((item, index) => {
                console.log(`  [${index}]`, item);
            });
        } else {
            console.table(itemsToShow);
        }

        if (items.length > maxItems) {
            console.log(`  ... and ${items.length - maxItems} more items`);
        }
    }

    console.groupEnd();
}

/**
 * Log responses collection
 */
export function logResponses(responses: QuestionResponse[], expanded = false) {
    if (process.env.NODE_ENV !== "development") return;

    logCollection("Responses", responses, { expanded });

    // Additional stats
    const answered = responses.filter(
        (r) => r.response && Object.keys(r.response).length > 0
    ).length;
    console.log(`  ✅ Answered: ${answered}/${responses.length}`);
}

/**
 * Log state collection
 */
export function logState(states: QuestionState[], expanded = false) {
    if (process.env.NODE_ENV !== "development") return;

    logCollection("State", states, { expanded });

    // Additional stats
    const visited = states.filter((s) => s.visited).length;
    const marked = states.filter((s) => s.markedForReview).length;
    console.log(`  👁️  Visited: ${visited}/${states.length}`);
    console.log(`  🔖 Marked for Review: ${marked}/${states.length}`);
}

/**
 * Log questions collection
 */
export function logQuestions(questions: QuestionItem[], expanded = false) {
    if (process.env.NODE_ENV !== "development") return;

    logCollection("Questions", questions, { expanded });

    // Additional stats
    const byType = questions.reduce(
        (acc, q) => {
            acc[q.type] = (acc[q.type] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    console.log("  📝 By Type:", byType);
}

/**
 * Log all collections at once
 */
export function logAllCollections(
    responses: QuestionResponse[],
    states: QuestionState[],
    questions: QuestionItem[],
    expanded = false
) {
    if (process.env.NODE_ENV !== "development") return;

    console.group("🗄️  TanStack DB Collections");
    console.log(`  Timestamp: ${new Date().toLocaleString()}`);
    console.log("");

    logQuestions(questions, expanded);
    console.log("");

    logResponses(responses, expanded);
    console.log("");

    logState(states, expanded);

    console.groupEnd();
}

/**
 * Log a single response change
 */
export function logResponseChange(
    questionId: string,
    response: StudentAnswer,
    action: "insert" | "update" | "delete"
) {
    if (process.env.NODE_ENV !== "development") return;

    const emoji = action === "insert" ? "➕" : action === "update" ? "✏️" : "🗑️";
    console.log(`${emoji} Response ${action}:`, {
        questionId,
        response,
        timestamp: new Date().toLocaleTimeString(),
    });
}

/**
 * Log a state change
 */
export function logStateChange(
    questionId: string,
    changes: Partial<QuestionState>,
    action: "insert" | "update"
) {
    if (process.env.NODE_ENV !== "development") return;

    const emoji = action === "insert" ? "➕" : "✏️";
    console.log(`${emoji} State ${action}:`, {
        questionId,
        changes,
        timestamp: new Date().toLocaleTimeString(),
    });
}

/**
 * Create a logger instance for a specific quiz
 */
export function createCollectionLogger(quizId: string) {
    if (process.env.NODE_ENV !== "development") {
        return {
            logResponses: () => {},
            logState: () => {},
            logQuestions: () => {},
            logAll: () => {},
            logResponseChange: () => {},
            logStateChange: () => {},
        };
    }

    return {
        logResponses: (responses: QuestionResponse[], expanded = false) => {
            console.group(`📊 Quiz: ${quizId}`);
            logResponses(responses, expanded);
            console.groupEnd();
        },
        logState: (states: QuestionState[], expanded = false) => {
            console.group(`📊 Quiz: ${quizId}`);
            logState(states, expanded);
            console.groupEnd();
        },
        logQuestions: (questions: QuestionItem[], expanded = false) => {
            console.group(`📊 Quiz: ${quizId}`);
            logQuestions(questions, expanded);
            console.groupEnd();
        },
        logAll: (
            responses: QuestionResponse[],
            states: QuestionState[],
            questions: QuestionItem[],
            expanded = false
        ) => {
            console.group(`📊 Quiz: ${quizId}`);
            logAllCollections(responses, states, questions, expanded);
            console.groupEnd();
        },
        logResponseChange,
        logStateChange,
    };
}
