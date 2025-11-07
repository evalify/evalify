import { index, integer, varchar, uuid, pgEnum } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";
import { usersTable } from "../user/user";

export const banksTable = pgTable(
    "banks",
    {
        id: uuid().primaryKey().defaultRandom(),
        name: varchar({ length: 255 }).notNull(),
        courseCode: varchar("course_code", { length: 50 }),
        semester: integer().notNull(),
        createdById: uuid("created_by_id").references(() => usersTable.id, {
            onDelete: "set null",
        }),
        ...timestamps,
    },
    (table) => [
        index("idx_banks_course_code").on(table.courseCode),
        index("idx_banks_semester").on(table.semester),
        index("idx_banks_created_by_id").on(table.createdById),
    ]
);

export const bankAccessLevelEnum = pgEnum("bank_access_level", ["READ", "WRITE", "OWNER"]);

// Junction table for bank shared users
export const bankUsersTable = pgTable(
    "bank_users",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        accessLevel: bankAccessLevelEnum("access_level").notNull().default("READ"),
        bankId: uuid("bank_id")
            .notNull()
            .references(() => banksTable.id, { onDelete: "cascade" }),
        userId: uuid("user_id")
            .notNull()
            .references(() => usersTable.id, { onDelete: "cascade" }),
        ...timestamps,
    },
    (table) => [
        index("idx_bank_users_bank_id").on(table.bankId),
        index("idx_bank_users_user_id").on(table.userId),
    ]
);
