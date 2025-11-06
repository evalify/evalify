import { index, integer, varchar } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { statusEnum, timestamps } from "../utils";

export const departmentsTable = pgTable(
    "departments",
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity(),
        name: varchar({ length: 255 }).notNull().unique(),
        isActive: statusEnum("is_active").notNull().default("ACTIVE"),
        ...timestamps,
    },
    (table) => [
        index("idx_departments_name").on(table.name),
        index("idx_departments_is_active").on(table.isActive),
    ]
);
