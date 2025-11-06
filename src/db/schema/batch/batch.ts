import { index, integer, varchar } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { statusEnum, timestamps } from "../utils";
import { departmentsTable } from "../department/department";

export const batchesTable = pgTable(
  "batches",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    joinYear: integer("join_year").notNull(),
    graduationYear: integer("graduation_year").notNull(),
    section: varchar({ length: 10 }).notNull(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departmentsTable.id, { onDelete: "cascade" }),
    isActive: statusEnum("is_active").notNull().default("ACTIVE"),
    ...timestamps,
  },
  (table) => [
    index("idx_batches_department_id").on(table.departmentId),
    index("idx_batches_join_year").on(table.joinYear),
    index("idx_batches_graduation_year").on(table.graduationYear),
    index("idx_batches_section").on(table.section),
    index("idx_batches_is_active").on(table.isActive),
  ]
);
