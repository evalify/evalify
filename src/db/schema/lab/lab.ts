import { index, uuid, varchar } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { statusEnum, timestamps } from "../utils";

export const labsTable = pgTable(
    "labs",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        name: varchar({ length: 255 }).notNull(),
        block: varchar({ length: 100 }).notNull(),
        ipSubnet: varchar("ip_subnet", { length: 50 }).notNull(),
        isActive: statusEnum("is_active").notNull().default("ACTIVE"),
        ...timestamps,
    },
    (table) => [
        index("idx_labs_block").on(table.block),
        index("idx_labs_ip_subnet").on(table.ipSubnet),
        index("idx_labs_is_active").on(table.isActive),
    ]
);
