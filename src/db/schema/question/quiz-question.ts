import { index, integer, uuid } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";
import { quizzesTable, quizSectionsTable } from "../quiz/quiz";
import { questionsTable } from "./question";

// Junction table relating quizzes to questions
export const quizQuestionsTable = pgTable(
    "quiz_questions",
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity(),
        quizId: uuid("quiz_id")
            .notNull()
            .references(() => quizzesTable.id, { onDelete: "cascade" }),
        questionId: uuid("question_id")
            .notNull()
            .references(() => questionsTable.id, { onDelete: "cascade" }),
        sectionId: uuid("section_id").references(() => quizSectionsTable.id, {
            onDelete: "set null",
        }),

        // Order of question in the quiz/section
        orderIndex: integer("order_index").notNull(),

        ...timestamps,
    },
    (table) => [
        index("idx_quiz_questions_quiz_id").on(table.quizId),
        index("idx_quiz_questions_question_id").on(table.questionId),
        index("idx_quiz_questions_section_id").on(table.sectionId),
        index("idx_quiz_questions_order").on(table.orderIndex),
    ]
);
