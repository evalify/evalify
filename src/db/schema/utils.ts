import { pgEnum, timestamp } from "drizzle-orm/pg-core";

export const timestamps = {
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
};

export const statusEnum = pgEnum("status", ["ACTIVE", "INACTIVE"]);

export const courseTypeEnum = pgEnum("course_type", [
  "CORE",
  "ELECTIVE",
  "MICRO_CREDENTIAL",
]);
