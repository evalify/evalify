import { db } from "@/db";
import { quizResponseTable } from "@/db/schema/quiz/quiz-response";
import { and, eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

export type StudentQuizStatus = "COMPLETED" | "MISSED" | "ACTIVE" | "UPCOMING";

type QuizResponseRecord = {
    submissionStatus: "NOT_SUBMITTED" | "SUBMITTED" | "AUTO_SUBMITTED";
    startTime?: string | Date | null;
    endTime?: string | Date | null;
    // other fields exist but are not needed for status determination
};

/**
 * Determine student-specific quiz status using `quiz_response` table.
 * Rules:
 * - If there is a quiz_response and submissionStatus is SUBMITTED or AUTO_SUBMITTED => COMPLETED
 * - If there is no quiz_response and current time > endTime => MISSED
 * - If there is a quiz_response and current time < endTime => ACTIVE
 * - Otherwise => ACTIVE (student can still take the quiz)
 */
export async function getStudentQuizStatus(
    quizId: string,
    studentId: string,
    startTime?: string | Date | null,
    endTime?: string | Date | null
): Promise<StudentQuizStatus> {
    try {
        const resp = await db
            .select()
            .from(quizResponseTable)
            .where(
                and(
                    eq(quizResponseTable.quizId, quizId),
                    eq(quizResponseTable.studentId, studentId)
                )
            )
            .limit(1);

        const now = new Date();
        const start = startTime ? new Date(startTime) : null;
        const end = endTime ? new Date(endTime) : null;

        // If a response exists for the student
        if (resp.length > 0) {
            const entry = resp[0] as QuizResponseRecord;
            const status = entry.submissionStatus;
            if (status === "SUBMITTED" || status === "AUTO_SUBMITTED") {
                return "COMPLETED";
            }

            // If the quiz hasn't started yet, it's UPCOMING
            if (start && now < start) return "UPCOMING";

            // If quiz end has passed and student hasn't submitted, it's MISSED
            if (end && now > end) return "MISSED";

            // Otherwise the student has started but not submitted and quiz is ongoing
            return "ACTIVE";
        }

        // No response from student
        // If start exists and is in future => UPCOMING
        if (start && now < start) return "UPCOMING";

        // If no response and end passed => MISSED
        if (end && now > end) return "MISSED";

        // Default to ACTIVE (student can still take the quiz)
        return "ACTIVE";
    } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error({ err: error, quizId, studentId }, "Failed to determine student quiz status");
        return "ACTIVE";
    }
}

/**
 * Parse Postgres interval string into milliseconds.
 * Expected formats: "HH:MM:SS" or "X days HH:MM:SS".
 */
export function parseIntervalToMs(interval: string | null | undefined): number {
    if (!interval) return 0;
    try {
        const parts = interval.split(" ");
        let days = 0;
        const timePart = parts[parts.length - 1];

        if (parts.length === 3 && parts[1].startsWith("day")) {
            days = parseInt(parts[0], 10) || 0;
        }

        const [hh = "0", mm = "0", ss = "0"] = timePart.split(":");
        const hours = parseInt(hh, 10) || 0;
        const minutes = parseInt(mm, 10) || 0;
        const seconds = parseInt(ss, 10) || 0;

        return (
            days * 24 * 60 * 60 * 1000 +
            hours * 60 * 60 * 1000 +
            minutes * 60 * 1000 +
            seconds * 1000
        );
    } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        logger.error({ err: e, interval }, "Failed to parse interval");
        return 0;
    }
}
