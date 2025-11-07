import { index, uuid, primaryKey } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { batchesTable } from "./batch";
import { usersTable } from "../user/user";
import { timestamps } from "../utils";

export const batchManagersTable = pgTable(
    "batch_managers",
    {
        batchId: uuid("batch_id")
            .notNull()
            .references(() => batchesTable.id, { onDelete: "cascade" }),
        managerId: uuid("manager_id")
            .notNull()
            .references(() => usersTable.id, { onDelete: "cascade" }),
        ...timestamps,
    },
    (table) => [
        primaryKey({ columns: [table.batchId, table.managerId] }),
        index("idx_batch_managers_batch_id").on(table.batchId),
        index("idx_batch_managers_manager_id").on(table.managerId),
    ]
);
