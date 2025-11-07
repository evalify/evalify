import { index, varchar, uuid, jsonb, real } from "drizzle-orm/pg-core";
import { pgTable, pgEnum } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";
import { usersTable } from "../user/user";

// Question type enum
export const questionTypeEnum = pgEnum("question_type", [
    "MCQ",
    "MMCQ",
    "TRUE_FALSE",
    "DESCRIPTIVE",
    "FILL_THE_BLANK",
    "MATCHING",
    "FILE_UPLOAD",
    "CODING",
]);

// Difficulty level enum
export const difficultyLevelEnum = pgEnum("difficulty_level", ["EASY", "MEDIUM", "HARD"]);

export const courseOutcomeEnum = pgEnum("course_outcome", [
    "CO1",
    "CO2",
    "CO3",
    "CO4",
    "CO5",
    "CO6",
    "CO7",
    "CO8",
]);

export const bloomTaxonomyLevelEnum = pgEnum("bloom_taxonomy_level", [
    "REMEMBER",
    "UNDERSTAND",
    "APPLY",
    "ANALYZE",
    "EVALUATE",
    "CREATE",
]);

// Main questions table with discriminator pattern
export const questionsTable = pgTable(
    "questions",
    {
        id: uuid().primaryKey().defaultRandom(),
        type: questionTypeEnum().notNull(),

        // Common fields for all question types
        marks: real().notNull().default(1),
        negativeMarks: real("negative_marks").default(0),
        difficulty: difficultyLevelEnum().default("MEDIUM"),
        courseOutcome: courseOutcomeEnum("course_outcome"),
        bloomTaxonomyLevel: bloomTaxonomyLevelEnum("bloom_taxonomy_level"),

        // Rich content fields
        question: varchar({ length: 5000 }).notNull(),

        // Type-specific data stored as JSONB
        // For MCQ/MMCQ: { options: [{text, isCorrect, image}], correctAnswers: [] }
        // For TRUE_FALSE: { correctAnswer: boolean }
        // For FILL_THE_BLANK: { blanks: [{position, correctAnswers: []}] }
        // For MATCHING: { leftItems: [], rightItems: [], correctMatches: [] }
        // For FILE_UPLOAD: { allowedFileTypes: [], maxFileSize: number, maxFiles: number }
        // For CODING: { language: string, starterCode: string, testCases: [], constraints: {} }
        questionData: jsonb("question_data").notNull(),

        // Solution
        solution: jsonb("solution").notNull(),

        // Audit fields
        createdById: uuid("created_by_id")
            .notNull()
            .references(() => usersTable.id, { onDelete: "cascade" }),
        ...timestamps,
    },
    (table) => [
        index("idx_questions_type").on(table.type),
        index("idx_questions_difficulty").on(table.difficulty),
        index("idx_questions_created_by_id").on(table.createdById),
    ]
);
