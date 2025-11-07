import { index, integer, uuid } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";
import { banksTable } from "../bank/bank";
import { questionsTable } from "./question";

// Junction table relating banks to questions
export const bankQuestionsTable = pgTable(
    "bank_questions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        bankId: uuid("bank_id")
            .notNull()
            .references(() => banksTable.id, { onDelete: "cascade" }),
        questionId: uuid("question_id")
            .notNull()
            .references(() => questionsTable.id, { onDelete: "cascade" }),
        // Order of question in the bank (optional)
        orderIndex: integer("order_index"),
        ...timestamps,
    },
    (table) => [
        index("idx_bank_questions_bank_id").on(table.bankId),
        index("idx_bank_questions_question_id").on(table.questionId),
        index("idx_bank_questions_order").on(table.orderIndex),
    ]
);
