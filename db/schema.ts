import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  defaultMode: text("default_mode", { enum: ["GUIDED", "INDEPENDENT", "INTERVIEW"] }).notNull().default("GUIDED"),
  defaultTimeLimit: integer("default_time_limit").notNull().default(25),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const accountRehearsals = sqliteTable("account_rehearsals", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  incidentTemplateId: text("incident_template_id").notNull(),
  incidentName: text("incident_name").notNull(),
  repositoryName: text("repository_name").notNull(),
  mode: text("mode", { enum: ["GUIDED", "INDEPENDENT", "INTERVIEW"] }).notNull(),
  status: text("status", { enum: ["COMPLETED", "UNRESOLVED"] }).notNull(),
  score: integer("score").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  hintsUsed: integer("hints_used").notNull().default(0),
  completedAt: text("completed_at").notNull(),
  createdAt: text("created_at").notNull(),
});
