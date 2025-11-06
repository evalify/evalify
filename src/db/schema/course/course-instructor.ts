import { index, integer, primaryKey } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { coursesTable } from "./course";
import { usersTable } from "../user/user";
import { timestamps } from "../utils";

export const courseInstructorsTable = pgTable(
    "course_instructors",
    {
        courseId: integer("course_id")
            .notNull()
            .references(() => coursesTable.id, { onDelete: "cascade" }),
        instructorId: integer("instructor_id")
            .notNull()
            .references(() => usersTable.id, { onDelete: "cascade" }),
        ...timestamps,
    },
    (table) => [
        primaryKey({ columns: [table.courseId, table.instructorId] }),
        index("idx_course_instructors_course_id").on(table.courseId),
        index("idx_course_instructors_instructor_id").on(table.instructorId),
    ]
);
