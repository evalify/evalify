import { index, integer, text, varchar } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { courseTypeEnum, statusEnum, timestamps } from "../utils";
import { semestersTable } from "../semester/semester";

export const coursesTable = pgTable(
  "courses",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    description: text().notNull(),
    code: varchar({ length: 50 }).notNull().unique(),
    image: varchar({ length: 512 }),
    type: courseTypeEnum("type").notNull(),
    semesterId: integer("semester_id")
      .notNull()
      .references(() => semestersTable.id, { onDelete: "cascade" }),
    isActive: statusEnum("is_active").notNull().default("ACTIVE"),
    ...timestamps,
  },
  (table) => [
    index("idx_courses_semester_id").on(table.semesterId),
    index("idx_courses_type").on(table.type),
    index("idx_courses_code").on(table.code),
    index("idx_courses_is_active").on(table.isActive),
  ]
);
