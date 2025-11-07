import { index, uuid, primaryKey } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { coursesTable } from "./course";
import { batchesTable } from "../batch/batch";
import { timestamps } from "../utils";

export const courseBatchesTable = pgTable(
    "course_batches",
    {
        courseId: uuid("course_id")
            .notNull()
            .references(() => coursesTable.id, { onDelete: "cascade" }),
        batchId: uuid("batch_id")
            .notNull()
            .references(() => batchesTable.id, { onDelete: "cascade" }),
        ...timestamps,
    },
    (table) => [
        primaryKey({ columns: [table.courseId, table.batchId] }),
        index("idx_course_batches_course_id").on(table.courseId),
        index("idx_course_batches_batch_id").on(table.batchId),
    ]
);
