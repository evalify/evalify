import { db } from "@/db";
import { quizResponseTable, quizzesTable } from "@/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Auto-submit expired quizzes
 *
 * This job runs periodically to find quizzes that have exceeded their end time
 * but haven't been submitted yet. It marks them as AUTO_SUBMITTED.
 */
export async function autoSubmitExpiredQuizzes() {
    const now = new Date();

    try {
        // Find all NOT_SUBMITTED responses where endTime has passed
        // and quiz has autoSubmit enabled
        const expiredResponses = await db
            .select({
                quizId: quizResponseTable.quizId,
                studentId: quizResponseTable.studentId,
                endTime: quizResponseTable.endTime,
            })
            .from(quizResponseTable)
            .innerJoin(quizzesTable, eq(quizResponseTable.quizId, quizzesTable.id))
            .where(
                and(
                    eq(quizResponseTable.submissionStatus, "NOT_SUBMITTED"),
                    lt(quizResponseTable.endTime, now),
                    eq(quizzesTable.autoSubmit, true)
                )
            );

        if (expiredResponses.length === 0) {
            return { submitted: 0 };
        }

        logger.info({ count: expiredResponses.length }, "Found expired quizzes to auto-submit");

        // Auto-submit each expired response
        // We do this one by one to log each event, but could be batched for performance if needed
        let submittedCount = 0;

        for (const response of expiredResponses) {
            try {
                await db
                    .update(quizResponseTable)
                    .set({
                        submissionStatus: "AUTO_SUBMITTED",
                        submissionTime: now,
                    })
                    .where(
                        and(
                            eq(quizResponseTable.quizId, response.quizId),
                            eq(quizResponseTable.studentId, response.studentId)
                        )
                    );

                logger.info(
                    {
                        quizId: response.quizId,
                        studentId: response.studentId,
                        endTime: response.endTime,
                    },
                    "Quiz auto-submitted by background job"
                );
                submittedCount++;
            } catch (err) {
                logger.error(
                    {
                        err,
                        quizId: response.quizId,
                        studentId: response.studentId,
                    },
                    "Failed to auto-submit quiz"
                );
            }
        }

        return { submitted: submittedCount };
    } catch (error) {
        logger.error({ error }, "Error in auto-submit job");
        throw error;
    }
}
