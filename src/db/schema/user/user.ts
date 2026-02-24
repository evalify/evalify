import { date, integer, uuid, varchar } from "drizzle-orm/pg-core";
import { pgEnum, pgTable } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "MANAGER", "FACULTY", "STUDENT"]);

export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "INACTIVE", "SUSPENDED"]);

export const userThemeEnum = pgEnum("user_theme", ["light", "dark", "system"]);

export const userViewEnum = pgEnum("user_view", ["list", "grid"]);

export const usersTable = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull().unique(),
    personalEmail: varchar("personal_email", { length: 255 }),
    profileId: varchar("profile_id", { length: 255 }).notNull().unique(),
    profileImage: varchar("profile_image", { length: 1024 }),
    role: userRoleEnum("role").notNull().default("STUDENT"),
    phoneNumber: varchar("phone_number", { length: 20 }),
    dob: date("dob"),
    gender: varchar("gender", { length: 10 }),
    city: varchar("city", { length: 255 }),
    state: varchar("state", { length: 255 }),
    status: userStatusEnum("status").notNull().default("ACTIVE"),

    theme: userThemeEnum("theme").notNull().default("light"),
    view: userViewEnum("view").notNull().default("list"),
    ...timestamps,
});
