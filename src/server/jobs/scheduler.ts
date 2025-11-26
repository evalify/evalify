import cron from "node-cron";
import { autoSubmitExpiredQuizzes } from "./auto-submit-quizzes";
import { logger } from "@/lib/logger";

let isSchedulerRunning = false;

/**
 * Start the auto-submit scheduler
 *
 * This should be called when the server starts.
 * It schedules the auto-submit job to run every minute.
 */
export function startAutoSubmitScheduler() {
    if (isSchedulerRunning) {
        logger.warn("Auto-submit scheduler is already running");
        return;
    }

    logger.info("Starting auto-submit scheduler...");

    // Run every minute
    cron.schedule("* * * * *", async () => {
        try {
            logger.debug("Running auto-submit job...");
            const result = await autoSubmitExpiredQuizzes();
            if (result.submitted > 0) {
                logger.info({ count: result.submitted }, "Auto-submit job completed");
            }
        } catch (error) {
            logger.error({ error }, "Auto-submit job failed");
        }
    });

    isSchedulerRunning = true;
    logger.info("Auto-submit scheduler started");
}
