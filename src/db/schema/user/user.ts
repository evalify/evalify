import { integer, varchar } from "drizzle-orm/pg-core";
import { pgEnum, pgTable } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";


export const userRoleEnum = pgEnum("user_role", [
  "ADMIN",
  "MANAGER",
  "FACULTY",
  "STUDENT",
]);

export const userStatusEnum = pgEnum("user_status", [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
]);

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  profileId: varchar("profile_id", { length: 255 }).notNull(),
  profileImage: varchar("profile_image", { length: 512 }),
  role: userRoleEnum("role").notNull().default("STUDENT"),
  phoneNumber: varchar("phone_number", { length: 20 }),

  status: userStatusEnum("status").notNull().default("ACTIVE"),
  ...timestamps,
});
