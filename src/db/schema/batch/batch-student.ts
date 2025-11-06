import { index, integer, primaryKey } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { batchesTable } from "./batch";
import { usersTable } from "../user/user";
import { timestamps } from "../utils";

export const batchStudentsTable = pgTable(
  "batch_students",
  {
    batchId: integer("batch_id")
      .notNull()
      .references(() => batchesTable.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.batchId, table.studentId] }),
    index("idx_batch_students_batch_id").on(table.batchId),
    index("idx_batch_students_student_id").on(table.studentId),
  ]
);
