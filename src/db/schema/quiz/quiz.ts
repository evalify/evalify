import {
    index,
    integer,
    varchar,
    uuid,
    text,
    timestamp,
    boolean,
    interval,
} from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";
import { usersTable } from "../user/user";
import { coursesTable } from "../course/course";
import { labsTable } from "../lab/lab";
import { batchesTable } from "../batch/batch";

export const quizzesTable = pgTable(
    "quizzes",
    {
        id: uuid().primaryKey().defaultRandom(),
        name: varchar({ length: 255 }).notNull(),
        description: text(),
        instructions: text(),

        // Time settings
        startTime: timestamp("start_time").notNull(),
        endTime: timestamp("end_time").notNull(),
        duration: interval().notNull(), // Duration for each student

        // Security settings
        password: varchar({ length: 255 }),

        // Quiz behavior settings
        fullScreen: boolean("full_screen").notNull().default(false),
        shuffleQuestions: boolean("shuffle_questions").notNull().default(false),
        shuffleOptions: boolean("shuffle_options").notNull().default(false),
        linearQuiz: boolean("linear_quiz").notNull().default(false),
        calculator: boolean().notNull().default(false),
        autoSubmit: boolean("auto_submit").notNull().default(false),
        publishResult: boolean("publish_result").notNull().default(false),
        publishQuiz: boolean("publish_quiz").notNull().default(false),
        kioskMode: boolean("kiosk_mode").default(false),

        ...timestamps,
        createdById: integer("created_by_id").references(() => usersTable.id, {
            onDelete: "set null",
        }),
    },
    (table) => [
        index("idx_quizzes_start_time").on(table.startTime),
        index("idx_quizzes_end_time").on(table.endTime),
        index("idx_quizzes_created_by_id").on(table.createdById),
        index("idx_quizzes_publish_quiz").on(table.publishQuiz),
    ]
);

// Quiz sections table (for organizing questions in sections)
export const quizSectionsTable = pgTable(
    "quiz_sections",
    {
        id: uuid().primaryKey().defaultRandom(),
        quizId: uuid("quiz_id")
            .notNull()
            .references(() => quizzesTable.id, { onDelete: "cascade" }),
        name: varchar({ length: 255 }).notNull(),
        orderIndex: integer("order_index").notNull(),
        ...timestamps,
    },
    (table) => [
        index("idx_quiz_sections_quiz_id").on(table.quizId),
        index("idx_quiz_sections_order").on(table.orderIndex),
    ]
);

// Quiz tags table
export const quizTagsTable = pgTable(
    "quiz_tags",
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity(),
        name: varchar({ length: 100 }).notNull().unique(),
        ...timestamps,
    },
    (table) => [index("idx_quiz_tags_name").on(table.name)]
);

// Junction table: Quiz to Tags
export const quizQuizTagsTable = pgTable(
    "quiz_quiz_tags",
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity(),
        quizId: uuid("quiz_id")
            .notNull()
            .references(() => quizzesTable.id, { onDelete: "cascade" }),
        quizTagId: integer("quiz_tag_id")
            .notNull()
            .references(() => quizTagsTable.id, { onDelete: "cascade" }),
        ...timestamps,
    },
    (table) => [
        index("idx_quiz_quiz_tags_quiz_id").on(table.quizId),
        index("idx_quiz_quiz_tags_tag_id").on(table.quizTagId),
    ]
);

// Junction table: Quiz to Courses
export const courseQuizzesTable = pgTable(
    "course_quizzes",
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity(),
        quizId: uuid("quiz_id")
            .notNull()
            .references(() => quizzesTable.id, { onDelete: "cascade" }),
        courseId: integer("course_id")
            .notNull()
            .references(() => coursesTable.id, { onDelete: "cascade" }),
        ...timestamps,
    },
    (table) => [
        index("idx_course_quizzes_quiz_id").on(table.quizId),
        index("idx_course_quizzes_course_id").on(table.courseId),
    ]
);

// Junction table: Quiz to Students
export const studentQuizzesTable = pgTable(
    "student_quizzes",
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity(),
        quizId: uuid("quiz_id")
            .notNull()
            .references(() => quizzesTable.id, { onDelete: "cascade" }),
        studentId: integer("student_id")
            .notNull()
            .references(() => usersTable.id, { onDelete: "cascade" }),
        ...timestamps,
    },
    (table) => [
        index("idx_student_quizzes_quiz_id").on(table.quizId),
        index("idx_student_quizzes_student_id").on(table.studentId),
    ]
);

// Junction table: Quiz to Labs
export const labQuizzesTable = pgTable(
    "lab_quizzes",
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity(),
        quizId: uuid("quiz_id")
            .notNull()
            .references(() => quizzesTable.id, { onDelete: "cascade" }),
        labId: integer("lab_id")
            .notNull()
            .references(() => labsTable.id, { onDelete: "cascade" }),
        ...timestamps,
    },
    (table) => [
        index("idx_lab_quizzes_quiz_id").on(table.quizId),
        index("idx_lab_quizzes_lab_id").on(table.labId),
    ]
);

// Junction table: Quiz to Batches
export const quizBatchesTable = pgTable(
    "quiz_batches",
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity(),
        quizId: uuid("quiz_id")
            .notNull()
            .references(() => quizzesTable.id, { onDelete: "cascade" }),
        batchId: integer("batch_id")
            .notNull()
            .references(() => batchesTable.id, { onDelete: "cascade" }),
        ...timestamps,
    },
    (table) => [
        index("idx_quiz_batches_quiz_id").on(table.quizId),
        index("idx_quiz_batches_batch_id").on(table.batchId),
    ]
);

// Junction table for quiz shared users
export const quizUsersTable = pgTable(
    "quiz_users",
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity(),
        quizId: uuid("quiz_id")
            .notNull()
            .references(() => quizzesTable.id, { onDelete: "cascade" }),
        userId: integer("user_id")
            .notNull()
            .references(() => usersTable.id, { onDelete: "cascade" }),
        ...timestamps,
    },
    (table) => [
        index("idx_quiz_users_quiz_id").on(table.quizId),
        index("idx_quiz_users_user_id").on(table.userId),
    ]
);
