import { index, integer } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";
import { batchesTable } from "../batch/batch";
import { semestersTable } from "./semester";

// Junction table for many-to-many relationship between semesters and batches
export const semesterBatchesTable = pgTable(
  "semester_batches",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    semesterId: integer("semester_id")
      .notNull()
      .references(() => semestersTable.id, { onDelete: "cascade" }),
    batchId: integer("batch_id")
      .notNull()
      .references(() => batchesTable.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    index("idx_semester_batches_semester_id").on(table.semesterId),
    index("idx_semester_batches_batch_id").on(table.batchId),
  ]
);
