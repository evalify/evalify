import { index, integer, primaryKey } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { semestersTable } from "./semester";
import { usersTable } from "../user/user";
import { timestamps } from "../utils";

export const semesterManagersTable = pgTable(
  "semester_managers",
  {
    semesterId: integer("semester_id")
      .notNull()
      .references(() => semestersTable.id, { onDelete: "cascade" }),
    managerId: integer("manager_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.semesterId, table.managerId] }),
    index("idx_semester_managers_semester_id").on(table.semesterId),
    index("idx_semester_managers_manager_id").on(table.managerId),
  ]
);
