import { z } from "zod";
import { createTRPCRouter, studentProcedure } from "../../../trpc";
import { db } from "@/db";
import { questionsTable } from "@/db/schema/question/question";
import { quizQuestionsTable } from "@/db/schema/question/quiz-question";
import { and, eq, inArray } from "drizzle-orm";
import { quizResponseTable } from "@/db/schema/quiz/quiz-response";
import { logger } from "@/lib/logger";
import {
    quizzesTable,
    quizSectionsTable,
    batchStudentsTable,
    studentQuizzesTable,
    quizBatchesTable,
    labsTable,
    labQuizzesTable,
} from "@/db/schema";
import { getClientIp, isClientInLabSubnets } from "@/lib/ip-utils";
import { TRPCError } from "@trpc/server";
import { parseIntervalToMs } from "./utils";
import {
    QuestionType,
    Difficulty,
    CourseOutcome,
    BloomsLevel,
    ProgrammingLanguage,
    FillInBlanksAcceptedType,
} from "@/types/questions";
import type {
    QuestionItem,
    StudentFillInBlanksConfig,
    StudentDescriptiveConfig,
    StudentCodingConfig,
    StudentTestCase,
    StudentFileUploadConfig,
} from "@/components/exam/lib/types";
import type { MCQData, MMCQData, MatchOptions } from "@/types/questions";

/**
 * Raw row shape returned by the Drizzle query for student questions.
 */
interface StudentQuestionRow {
    quizQuestionId: string;
    orderIndex: number;
    sectionId: string | null;
    bankQuestionId: string | null;
    id: string;
    type: QuestionType;
    marks: number;
    negativeMarks: number | null;
    difficulty: string | null;
    courseOutcome: string | null;
    bloomTaxonomyLevel: string | null;
    question: string;
    questionData: unknown;
}

// Raw shapes inside versioned questionData JSONB
interface MatchOptionRaw {
    id: string;
    isLeft: boolean;
    text: string;
    orderIndex: number;
}

interface CodingConfigRaw {
    language?: string;
    templateCode?: string;
    boilerplateCode?: string;
    timeLimitMs?: number;
    memoryLimitMb?: number;
}

interface TestCaseRaw {
    id: string;
    input: string;
    expectedOutput?: string;
    visibility: string;
    marksWeightage?: number;
    orderIndex: number;
}

interface FillInBlankConfigRaw {
    blankCount: number;
    blankWeights: Record<number, number>;
    evaluationType: string;
    acceptableAnswers?: Record<string, { type?: string }>;
}

interface FileUploadConfigRaw {
    allowedFileTypes?: string[];
    maxFileSizeInMB?: number;
    maxFiles?: number;
}

function unwrapVersionedData(data: unknown): unknown {
    if (data && typeof data === "object" && "version" in data && "data" in data) {
        return (data as { data: unknown }).data;
    }
    return data;
}

/**
 * Transform a raw DB row into a properly typed QuestionItem for the student exam view.
 * Strips solution data and sensitive fields (e.g. expectedOutput from test cases).
 */
function transformStudentQuestion(raw: StudentQuestionRow): QuestionItem {
    const unwrapped = unwrapVersionedData(raw.questionData);
    const type = raw.type;

    const base: QuestionItem = {
        id: raw.id,
        type: raw.type,
        sectionId: raw.sectionId,
        orderIndex: raw.orderIndex,
        marks: raw.marks,
        negativeMarks: raw.negativeMarks,
        difficulty: raw.difficulty as Difficulty | null,
        courseOutcome: raw.courseOutcome as CourseOutcome | null,
        bloomTaxonomyLevel: raw.bloomTaxonomyLevel as BloomsLevel | null,
        question: raw.question,
    };

    switch (type) {
        case QuestionType.MCQ:
        case QuestionType.MMCQ: {
            base.questionData = unwrapped as MCQData | MMCQData | undefined;
            break;
        }
        case QuestionType.TRUE_FALSE: {
            // No extra data needed for student view
            break;
        }
        case QuestionType.FILL_THE_BLANK: {
            const data = unwrapped as { config?: FillInBlankConfigRaw } | null;
            const config = data?.config;
            if (config) {
                const blankTypes: Record<number, FillInBlanksAcceptedType> = {};
                if (config.acceptableAnswers) {
                    for (const [idx, entry] of Object.entries(config.acceptableAnswers)) {
                        blankTypes[Number(idx)] = (entry.type ||
                            "TEXT") as FillInBlanksAcceptedType;
                    }
                }
                const blankConfig: StudentFillInBlanksConfig = {
                    blankCount: config.blankCount,
                    blankWeights: config.blankWeights,
                    blankTypes,
                    evaluationType: config.evaluationType,
                };
                base.blankConfig = blankConfig;
            }
            break;
        }
        case QuestionType.DESCRIPTIVE: {
            const data = unwrapped as { config?: { minWords?: number; maxWords?: number } } | null;
            const config = data?.config;
            if (config) {
                const descriptiveConfig: StudentDescriptiveConfig = {
                    minWords: config.minWords,
                    maxWords: config.maxWords,
                };
                base.descriptiveConfig = descriptiveConfig;
            }
            break;
        }
        case QuestionType.MATCHING: {
            const data = unwrapped as { options?: MatchOptionRaw[] } | null;
            const options = data?.options;
            if (options) {
                base.options = options.map(
                    (opt): MatchOptions => ({
                        id: opt.id,
                        isLeft: opt.isLeft,
                        text: opt.text,
                        orderIndex: opt.orderIndex,
                    })
                );
            }
            break;
        }
        case QuestionType.CODING: {
            const data = unwrapped as {
                config?: CodingConfigRaw;
                testCases?: TestCaseRaw[];
            } | null;
            const config = data?.config;
            const testCases = data?.testCases;
            if (config) {
                const codingConfig: StudentCodingConfig = {
                    language: (config.language || "PYTHON") as ProgrammingLanguage,
                    templateCode: config.templateCode,
                    boilerplateCode: config.boilerplateCode,
                    timeLimitMs: config.timeLimitMs,
                    memoryLimitMb: config.memoryLimitMb,
                };
                base.codingConfig = codingConfig;
            }
            if (testCases) {
                base.testCases = testCases
                    .filter((tc) => tc.visibility === "VISIBLE")
                    .map(
                        (tc): StudentTestCase => ({
                            id: tc.id,
                            input: tc.input,
                            visibility: tc.visibility,
                            marksWeightage: tc.marksWeightage,
                            orderIndex: tc.orderIndex,
                        })
                    );
            }
            break;
        }
        case QuestionType.FILE_UPLOAD: {
            const data = unwrapped as {
                attachedFiles?: string[];
                config?: FileUploadConfigRaw;
            } | null;
            const config = data?.config;
            if (config) {
                const fileUploadConfig: StudentFileUploadConfig = {
                    allowedFileTypes: config.allowedFileTypes,
                    maxFileSizeInMB: config.maxFileSizeInMB,
                    maxFiles: config.maxFiles,
                };
                base.fileUploadConfig = fileUploadConfig;
            }
            if (data?.attachedFiles) {
                base.attachedFiles = data.attachedFiles;
            }
            break;
        }
    }

    return base;
}

/**
 * Simple exam router exposing a `get` endpoint to fetch questions.
 * Input: optional `quizId` to fetch only questions belonging to a quiz.
 */
export const examRouter = createTRPCRouter({
    getResponse: studentProcedure
        .input(z.object({ quizId: z.uuid() }))
        .query(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            try {
                const resp = await db
                    .select()
                    .from(quizResponseTable)
                    .where(
                        and(
                            eq(quizResponseTable.quizId, input.quizId),
                            eq(quizResponseTable.studentId, userId)
                        )
                    )
                    .limit(1);

                if (resp.length === 0) return { response: null };
                return { response: resp[0] };
            } catch (error) {
                logger.error(
                    { error, userId, quizId: input.quizId },
                    "Error fetching quiz response"
                );
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to fetch quiz response",
                });
            }
        }),

    /**
     * Get questions for a student only if they have an active NOT_SUBMITTED quiz_response
     */
    getStudentQuestions: studentProcedure
        .input(z.object({ quizId: z.uuid() }))
        .query(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            try {
                const resp = await db
                    .select()
                    .from(quizResponseTable)
                    .where(
                        and(
                            eq(quizResponseTable.quizId, input.quizId),
                            eq(quizResponseTable.studentId, userId)
                        )
                    )
                    .limit(1);

                if (resp.length === 0) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "You must start the quiz before accessing questions",
                    });
                }

                const entry = resp[0];
                if (entry.submissionStatus !== "NOT_SUBMITTED") {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "Cannot access questions for a submitted quiz",
                    });
                }

                // Enforce time window - reject if end time has passed
                const now = new Date();
                if (entry.endTime && now > new Date(entry.endTime)) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "Quiz time has ended",
                    });
                }

                // Fetch questions for the specific quiz
                const questionsData = await db
                    .select({
                        quizQuestionId: quizQuestionsTable.id,
                        orderIndex: quizQuestionsTable.orderIndex,
                        sectionId: quizQuestionsTable.sectionId,
                        bankQuestionId: quizQuestionsTable.bankQuestionId,
                        id: questionsTable.id,
                        type: questionsTable.type,
                        marks: questionsTable.marks,
                        negativeMarks: questionsTable.negativeMarks,
                        difficulty: questionsTable.difficulty,
                        courseOutcome: questionsTable.courseOutcome,
                        bloomTaxonomyLevel: questionsTable.bloomTaxonomyLevel,
                        question: questionsTable.question,
                        questionData: questionsTable.questionData,
                    })
                    .from(questionsTable)
                    .innerJoin(
                        quizQuestionsTable,
                        eq(questionsTable.id, quizQuestionsTable.questionId)
                    )
                    .where(eq(quizQuestionsTable.quizId, input.quizId));

                const questions: QuestionItem[] = questionsData.map((q) =>
                    transformStudentQuestion({
                        ...q,
                        type: q.type as QuestionType,
                    })
                );

                return { questions };
            } catch (error) {
                logger.error(
                    { error, userId, quizId: input.quizId },
                    "Error fetching student questions"
                );
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to fetch questions",
                });
            }
        }),

    /**
     * Get sections for the quiz (student view) — requires active NOT_SUBMITTED quiz_response
     */
    getSections: studentProcedure
        .input(z.object({ quizId: z.uuid() }))
        .query(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            try {
                const resp = await db
                    .select()
                    .from(quizResponseTable)
                    .where(
                        and(
                            eq(quizResponseTable.quizId, input.quizId),
                            eq(quizResponseTable.studentId, userId)
                        )
                    )
                    .limit(1);

                if (resp.length === 0) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "You must start the quiz before accessing sections",
                    });
                }

                const entry = resp[0];
                if (entry.submissionStatus !== "NOT_SUBMITTED") {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "Cannot access sections for a submitted quiz",
                    });
                }

                // Enforce time window
                const now = new Date();
                if (entry.endTime && now > new Date(entry.endTime)) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "Quiz time has ended",
                    });
                }

                const sections = await db
                    .select({
                        id: quizSectionsTable.id,
                        name: quizSectionsTable.name,
                        orderIndex: quizSectionsTable.orderIndex,
                    })
                    .from(quizSectionsTable)
                    .where(eq(quizSectionsTable.quizId, input.quizId))
                    .orderBy(quizSectionsTable.orderIndex);

                return { sections };
            } catch (error) {
                logger.error(
                    { error, userId, quizId: input.quizId },
                    "Error fetching quiz sections"
                );
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to fetch sections",
                });
            }
        }),

    /**
     * Save partial answers / response JSON for the current quiz_response
     */
    saveAnswer: studentProcedure
        .input(z.object({ quizId: z.uuid(), responsePatch: z.any() }))
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            try {
                const existing = await db
                    .select()
                    .from(quizResponseTable)
                    .where(
                        and(
                            eq(quizResponseTable.quizId, input.quizId),
                            eq(quizResponseTable.studentId, userId)
                        )
                    )
                    .limit(1);

                if (existing.length === 0) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "No active quiz response found",
                    });
                }

                const entry = existing[0];
                if (entry.submissionStatus !== "NOT_SUBMITTED") {
                    throw new TRPCError({ code: "FORBIDDEN", message: "Quiz already submitted" });
                }

                // Enforce time window
                const now = new Date();
                if (entry.endTime && now > new Date(entry.endTime)) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "Quiz time has ended",
                    });
                }

                // Merge JSON response: naive merge where responsePatch overwrites fields
                const currentResponse = entry.response || {};
                const merged = { ...currentResponse, ...input.responsePatch };

                const [updated] = await db
                    .update(quizResponseTable)
                    .set({ response: merged })
                    .where(
                        and(
                            eq(quizResponseTable.quizId, input.quizId),
                            eq(quizResponseTable.studentId, userId)
                        )
                    )
                    .returning();

                logger.info({ userId, quizId: input.quizId }, "Saved quiz response patch");
                return { response: updated };
            } catch (error) {
                logger.error({ error, userId, quizId: input.quizId }, "Error saving quiz response");
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to save response",
                });
            }
        }),

    /**
     * Submit quiz: mark submissionStatus and submissionTime
     */
    submitQuiz: studentProcedure
        .input(z.object({ quizId: z.uuid() }))
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            try {
                const existing = await db
                    .select()
                    .from(quizResponseTable)
                    .where(
                        and(
                            eq(quizResponseTable.quizId, input.quizId),
                            eq(quizResponseTable.studentId, userId)
                        )
                    )
                    .limit(1);

                if (existing.length === 0) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "No active quiz response found",
                    });
                }

                const entry = existing[0];
                if (entry.submissionStatus !== "NOT_SUBMITTED") {
                    throw new TRPCError({ code: "FORBIDDEN", message: "Quiz already submitted" });
                }

                const now = new Date();

                // Note: Allow submission even if time has passed (students can submit after deadline)

                const [updated] = await db
                    .update(quizResponseTable)
                    .set({ submissionStatus: "SUBMITTED", submissionTime: now })
                    .where(
                        and(
                            eq(quizResponseTable.quizId, input.quizId),
                            eq(quizResponseTable.studentId, userId)
                        )
                    )
                    .returning();

                logger.info({ userId, quizId: input.quizId }, "Quiz submitted by student");
                return { response: updated };
            } catch (error) {
                logger.error(
                    { error, userId, quizId: input.quizId },
                    "Error submitting quiz response"
                );
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to submit quiz",
                });
            }
        }),

    /**
     * Start Quiz - create or update quiz_response and return the record
     */
    startQuiz: studentProcedure
        .input(z.object({ quizId: z.uuid(), password: z.string().optional() }))
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            try {
                const now = new Date();

                // Fetch quiz
                const quizResult = await db
                    .select({
                        id: quizzesTable.id,
                        startTime: quizzesTable.startTime,
                        endTime: quizzesTable.endTime,
                        duration: quizzesTable.duration,
                        password: quizzesTable.password,
                        publishQuiz: quizzesTable.publishQuiz,
                    })
                    .from(quizzesTable)
                    .where(
                        and(eq(quizzesTable.id, input.quizId), eq(quizzesTable.publishQuiz, true))
                    )
                    .limit(1);

                if (quizResult.length === 0) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Quiz not found or not published",
                    });
                }

                const quiz = quizResult[0];

                // Check timing: allow start only if currentTime >= startTime
                const startTime = new Date(quiz.startTime);
                if (now < startTime) {
                    throw new TRPCError({ code: "FORBIDDEN", message: "Quiz has not started yet" });
                }

                // Disallow start if quiz has already ended
                const quizEndTime = new Date(quiz.endTime);
                if (now >= quizEndTime) {
                    throw new TRPCError({ code: "FORBIDDEN", message: "Quiz has already ended" });
                }

                // If password protected, check password
                if (quiz.password && quiz.password.length > 0) {
                    if (!input.password || input.password !== quiz.password) {
                        throw new TRPCError({
                            code: "FORBIDDEN",
                            message: "Invalid quiz password",
                        });
                    }
                }

                // Verify student has access (direct or batch)
                const studentBatchIds = await db
                    .select({ batchId: batchStudentsTable.batchId })
                    .from(batchStudentsTable)
                    .where(eq(batchStudentsTable.studentId, userId));

                const directAssignment = await db
                    .select()
                    .from(studentQuizzesTable)
                    .where(
                        and(
                            eq(studentQuizzesTable.quizId, quiz.id),
                            eq(studentQuizzesTable.studentId, userId)
                        )
                    )
                    .limit(1);

                let hasAccess = directAssignment.length > 0;

                if (!hasAccess && studentBatchIds.length > 0) {
                    const batchAssignment = await db
                        .select()
                        .from(quizBatchesTable)
                        .where(
                            and(
                                eq(quizBatchesTable.quizId, quiz.id),
                                inArray(
                                    quizBatchesTable.batchId,
                                    studentBatchIds.map((b) => b.batchId)
                                )
                            )
                        )
                        .limit(1);

                    hasAccess = batchAssignment.length > 0;
                }

                if (!hasAccess) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "You don't have access to this quiz",
                    });
                }

                // Get lab subnets for the quiz
                const labInfo = await db
                    .select({ id: labsTable.id, ipSubnet: labsTable.ipSubnet })
                    .from(labsTable)
                    .innerJoin(labQuizzesTable, eq(labsTable.id, labQuizzesTable.labId))
                    .where(eq(labQuizzesTable.quizId, quiz.id));

                const labSubnets = labInfo.map((l) => l.ipSubnet).filter(Boolean);

                // Get client IP
                const clientIp = getClientIp(ctx.headers);

                // If labs assigned, client must be in lab subnet
                const isInLabSubnet =
                    labSubnets.length > 0 ? isClientInLabSubnets(clientIp, labSubnets) : true;
                if (!isInLabSubnet) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "You must be in an authorized lab to start this quiz",
                    });
                }

                // Check existing quiz response
                let existing;
                try {
                    existing = await db
                        .select()
                        .from(quizResponseTable)
                        .where(
                            and(
                                eq(quizResponseTable.quizId, quiz.id),
                                eq(quizResponseTable.studentId, userId)
                            )
                        )
                        .limit(1);
                } catch (dbErr) {
                    const e = dbErr instanceof Error ? dbErr : new Error(String(dbErr));
                    logger.error(
                        { err: e, quizId: quiz.id, userId },
                        "DB error fetching existing quiz_response"
                    );
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Failed to check quiz response",
                    });
                }

                // Compute endTime based on quiz.duration, but cap it to quiz.endTime
                const durationRaw = quiz.duration;
                const durationStr =
                    typeof durationRaw === "string"
                        ? durationRaw
                        : durationRaw
                          ? String(durationRaw)
                          : null;
                const durationMs = parseIntervalToMs(durationStr);
                const attemptEndTime = new Date(now.getTime() + durationMs);
                // Cap the end time to quiz's global end time
                const computedEndTime = new Date(
                    Math.min(quizEndTime.getTime(), attemptEndTime.getTime())
                );

                if (existing.length > 0) {
                    const existingEntry = existing[0];

                    if (existingEntry.submissionStatus !== "NOT_SUBMITTED") {
                        throw new TRPCError({
                            code: "FORBIDDEN",
                            message: "Quiz already submitted",
                        });
                    }

                    // Append client IP if available
                    const existingIps: string[] = Array.isArray(existingEntry.ip)
                        ? existingEntry.ip
                        : [];
                    const newIps = clientIp
                        ? Array.from(new Set([...existingIps, clientIp]))
                        : existingIps;

                    let updated;
                    try {
                        // Only update IP on resume — preserve original timing
                        [updated] = await db
                            .update(quizResponseTable)
                            .set({
                                ip: newIps,
                            })
                            .where(
                                and(
                                    eq(quizResponseTable.quizId, quiz.id),
                                    eq(quizResponseTable.studentId, userId)
                                )
                            )
                            .returning();
                    } catch (dbErr) {
                        const e = dbErr instanceof Error ? dbErr : new Error(String(dbErr));
                        logger.error(
                            { err: e, quizId: quiz.id, userId, action: "resume", newIps },
                            "DB error resuming quiz"
                        );
                        throw new TRPCError({
                            code: "INTERNAL_SERVER_ERROR",
                            message: "Failed to resume quiz",
                        });
                    }

                    logger.info({ userId, quizId: quiz.id, action: "resume" }, "Quiz resumed");
                    return { response: updated };
                }

                // Create new quiz response entry
                const values = {
                    quizId: quiz.id,
                    studentId: userId,
                    startTime: now,
                    endTime: computedEndTime,
                    duration: quiz.duration,
                    ip: clientIp ? [clientIp] : [],
                    isViolated: false,
                };

                let inserted;
                try {
                    [inserted] = await db.insert(quizResponseTable).values(values).returning();
                } catch (dbErr) {
                    const e = dbErr instanceof Error ? dbErr : new Error(String(dbErr));
                    logger.error(
                        { err: e, quizId: quiz.id, userId, values },
                        "DB error inserting quiz response"
                    );
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Failed to start quiz",
                    });
                }

                logger.info(
                    { userId, quizId: quiz.id, action: "start", clientIp },
                    "Quiz started for student"
                );

                return { response: inserted };
            } catch (error) {
                const e = error instanceof Error ? error : new Error(String(error));
                logger.error({ err: e, userId, quizId: input.quizId }, "Error starting quiz");
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to start quiz",
                });
            }
        }),

    /**
     * Check and trigger auto-submit if needed (manual check)
     */
    checkAutoSubmitStatus: studentProcedure
        .input(z.object({ quizId: z.uuid() }))
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            const now = new Date();

            const existing = await db
                .select({
                    response: quizResponseTable,
                    quiz: quizzesTable,
                })
                .from(quizResponseTable)
                .innerJoin(quizzesTable, eq(quizResponseTable.quizId, quizzesTable.id))
                .where(
                    and(
                        eq(quizResponseTable.quizId, input.quizId),
                        eq(quizResponseTable.studentId, userId),
                        eq(quizResponseTable.submissionStatus, "NOT_SUBMITTED")
                    )
                )
                .limit(1);

            if (existing.length === 0) {
                return { autoSubmitted: false };
            }

            const { response, quiz } = existing[0];

            // Check if time expired and autoSubmit is enabled
            if (quiz.autoSubmit && response.endTime && new Date(response.endTime) <= now) {
                await db
                    .update(quizResponseTable)
                    .set({
                        submissionStatus: "AUTO_SUBMITTED",
                        submissionTime: now,
                    })
                    .where(
                        and(
                            eq(quizResponseTable.quizId, input.quizId),
                            eq(quizResponseTable.studentId, userId)
                        )
                    );

                logger.info(
                    { userId, quizId: input.quizId },
                    "Quiz auto-submitted by manual check"
                );
                return { autoSubmitted: true };
            }

            return { autoSubmitted: false };
        }),
});
