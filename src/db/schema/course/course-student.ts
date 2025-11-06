import { index, integer, primaryKey } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { coursesTable } from "./course";
import { usersTable } from "../user/user";
import { timestamps } from "../utils";

export const courseStudentsTable = pgTable(
    "course_students",
    {
        courseId: integer("course_id")
            .notNull()
            .references(() => coursesTable.id, { onDelete: "cascade" }),
        studentId: integer("student_id")
            .notNull()
            .references(() => usersTable.id, { onDelete: "cascade" }),
        ...timestamps,
    },
    (table) => [
        primaryKey({ columns: [table.courseId, table.studentId] }),
        index("idx_course_students_course_id").on(table.courseId),
        index("idx_course_students_student_id").on(table.studentId),
    ]
);
