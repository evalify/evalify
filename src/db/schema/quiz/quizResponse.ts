import {
    uuid,
    timestamp,
    interval,
    decimal,
    pgEnum,
    index,
    text,
    primaryKey,
    json,
} from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";
import { usersTable } from "../user/user";
import { quizzesTable } from "./quiz";

export const submissionStatusEnum = pgEnum("submission_status", [
    "NOT_SUBMITTED",
    "SUBMITTED",
    "AUTO_SUBMITTED",
]);

export const evaluationStatusEnum = pgEnum("evaluation_status", [
    "NOT_EVALUATED",
    "EVALUATED",
    "FAILED",
]);

export const quizResponseTable = pgTable(
    "quiz_response",
    {
        quizId: uuid("quiz_id")
            .references(() => quizzesTable.id, { onDelete: "cascade" })
            .notNull(),
        studentId: uuid("student_id")
            .references(() => usersTable.id, { onDelete: "cascade" })
            .notNull(),
        startTime: timestamp("start_time").notNull(),
        endTime: timestamp("end_time"),
        submissionTime: timestamp("submission_time"),
        ip: text("ip").array(),
        duration: interval().notNull(),
        response: json("response"),
        score: decimal("score"),
        violations: text("violations").array(),

        submissionStatus: submissionStatusEnum("submission_status")
            .notNull()
            .default("NOT_SUBMITTED"),
        evaluationStatus: evaluationStatusEnum("evaluation_status")
            .notNull()
            .default("NOT_EVALUATED"),
        ...timestamps,
    },
    (table) => [
        primaryKey({ columns: [table.quizId, table.studentId] }),
        index("idx_quiz_response_quiz_id").on(table.quizId),
        index("idx_quiz_response_student_id").on(table.studentId),
        index("idx_quiz_response_submission_status").on(table.submissionStatus),
        index("idx_quiz_response_evaluation_status").on(table.evaluationStatus),
    ]
);
