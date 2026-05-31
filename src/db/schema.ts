import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  memo: text("memo").notNull().default(""),
  creatorTokenHash: text("creator_token_hash").notNull().default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const candidates = sqliteTable("candidates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const responses = sqliteTable("responses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  participantName: text("participant_name").notNull(),
  comment: text("comment").notNull().default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const responseDetails = sqliteTable("response_details", {
  responseId: integer("response_id")
    .notNull()
    .references(() => responses.id, { onDelete: "cascade" }),
  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["〇", "△", "×"] }).notNull(),
});
