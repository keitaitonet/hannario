import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
} as const;

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  cognitoSub: text("cognito_sub").notNull().unique(),
  name: text("name"),
  grantedAt: timestamp("granted_at", { withTimezone: true }),
  grantedById: integer("granted_by_id").references(
    (): AnyPgColumn => usersTable.id,
    { onDelete: "set null" },
  ),
  ...timestamps,
});

export const sessionsTable = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const discordOutboxTable = pgTable(
  "discord_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: text("channel_id").notNull(),
    threadId: text("thread_id"),
    content: text("content").notNull(),
    createdByUserId: integer("created_by_user_id").references(
      () => usersTable.id,
      { onDelete: "set null" },
    ),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: text("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("discord_outbox_due_idx").on(table.status, table.scheduledAt),
  ],
);

export const discordDestinationsTable = pgTable(
  "discord_destinations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    channelId: text("channel_id").notNull(),
    threadId: text("thread_id"),
    channelName: text("channel_name"),
    threadName: text("thread_name"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestamps,
  },
  (table) => [
    unique("discord_destinations_user_target_unique")
      .on(table.userId, table.channelId, table.threadId)
      .nullsNotDistinct(),
    index("discord_destinations_user_recent_idx").on(
      table.userId,
      table.lastUsedAt,
    ),
  ],
);

export const usersRelations = relations(usersTable, ({ many, one }) => ({
  sessions: many(sessionsTable),
  grantedBy: one(usersTable, {
    fields: [usersTable.grantedById],
    references: [usersTable.id],
    relationName: "grantedBy",
  }),
  grantedUsers: many(usersTable, { relationName: "grantedBy" }),
}));

export const sessionsRelations = relations(sessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sessionsTable.userId],
    references: [usersTable.id],
  }),
}));

export const discordDestinationsRelations = relations(
  discordDestinationsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [discordDestinationsTable.userId],
      references: [usersTable.id],
    }),
  }),
);
