import { index, uuid, pgTable } from "drizzle-orm/pg-core";
import { timestamps } from "../../utils";
import { topicsTable } from "./topic";
import { questionsTable } from "../../question/question";

// Junction table for Topic-Question many-to-many relationship
export const topicQuestionsTable = pgTable(
    "topic_questions",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        topicId: uuid("topic_id")
            .notNull()
            .references(() => topicsTable.id, { onDelete: "cascade" }),

        questionId: uuid("question_id")
            .notNull()
            .references(() => questionsTable.id, { onDelete: "cascade" }),

        ...timestamps,
    },
    (table) => [
        index("idx_topic_questions_topic_id").on(table.topicId),
        index("idx_topic_questions_question_id").on(table.questionId),
    ]
);
