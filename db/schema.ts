import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

export const accountRepositories = sqliteTable("account_repositories", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  source: text("source", { enum: ["UPLOAD", "GITHUB_PUBLIC", "GITHUB_CONNECTED"] }).notNull(),
  externalId: text("external_id"),
  name: text("name").notNull(),
  displayRef: text("display_ref").notNull(),
  language: text("language").notNull(),
  framework: text("framework").notNull(),
  database: text("database").notNull(),
  orm: text("orm").notNull(),
  testFramework: text("test_framework").notNull(),
  packageManager: text("package_manager").notNull(),
  fileCount: integer("file_count").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, table => [uniqueIndex("account_repositories_source_unique").on(table.accountId, table.source, table.externalId)]);
