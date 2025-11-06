import { index, pgTable, varchar, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "../../utils";
import { banksTable } from "../bank";

export const topicsTable = pgTable(
    "topics",
    {
        id: uuid().primaryKey().defaultRandom(),
        name: varchar({ length: 255 }).notNull(),

        // Many-to-One relationship with Bank
        bankId: uuid("bank_id")
            .notNull()
            .references(() => banksTable.id, { onDelete: "cascade" }),

        ...timestamps,
    },
    (table) => [
        index("idx_topics_name").on(table.name),
        index("idx_topics_bank_id").on(table.bankId),
    ]
);
