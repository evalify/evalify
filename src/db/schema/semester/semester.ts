import { index, integer, varchar } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { statusEnum, timestamps } from "../utils";
import { departmentsTable } from "../department/department";

export const semestersTable = pgTable(
  "semesters",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    year: integer().notNull(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departmentsTable.id, { onDelete: "cascade" }),
    isActive: statusEnum("is_active").notNull().default("ACTIVE"),
    ...timestamps,
  },
  (table) => [
    index("idx_semesters_year").on(table.year),
    index("idx_semesters_department_id").on(table.departmentId),
    index("idx_semesters_is_active").on(table.isActive),
  ]
);
