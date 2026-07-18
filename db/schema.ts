import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  defaultMode: text("default_mode", { enum: ["GUIDED", "INDEPENDENT", "INTERVIEW"] }).notNull().default("GUIDED"),
  defaultTimeLimit: integer("default_time_limit").notNull().default(25),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const authIdentities = sqliteTable("auth_identities", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  provider: text("provider", { enum: ["google", "github"] }).notNull(),
  providerSubject: text("provider_subject").notNull(),
  createdAt: text("created_at").notNull(),
  lastSignedInAt: text("last_signed_in_at").notNull(),
}, table => [
  uniqueIndex("auth_identities_provider_subject_unique").on(table.provider, table.providerSubject),
  index("auth_identities_account_idx").on(table.accountId),
]);

export const authSessions = sqliteTable("auth_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  provider: text("provider", { enum: ["google", "github"] }).notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
}, table => [index("auth_sessions_expiry_idx").on(table.expiresAt)]);

export const authLoginAttempts = sqliteTable("auth_login_attempts", {
  stateHash: text("state_hash").primaryKey(),
  provider: text("provider", { enum: ["google", "github"] }).notNull(),
  codeVerifier: text("code_verifier").notNull(),
  returnTo: text("return_to").notNull(),
  expiresAt: text("expires_at").notNull(),
}, table => [index("auth_login_attempts_expiry_idx").on(table.expiresAt)]);

export const githubRepositoryCatalog = sqliteTable("github_repository_catalog", {
  accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  repositoryId: text("repository_id").notNull(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  sourceUrl: text("source_url").notNull(),
  description: text("description"),
  language: text("language"),
  defaultBranch: text("default_branch").notNull(),
  repositoryUpdatedAt: text("repository_updated_at").notNull(),
  syncedAt: text("synced_at").notNull(),
}, table => [
  uniqueIndex("github_repository_catalog_account_repository_unique").on(table.accountId, table.repositoryId),
  index("github_repository_catalog_account_updated_idx").on(table.accountId, table.repositoryUpdatedAt),
]);

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

export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(),
  ownerAccountId: text("owner_account_id").notNull().unique().references(() => accounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const teamMembers = sqliteTable("team_members", {
  id: text("id").primaryKey(),
  teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  accountId: text("account_id").references(() => accounts.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["OWNER", "MEMBER"] }).notNull(),
  status: text("status", { enum: ["ACTIVE", "INVITED"] }).notNull(),
  invitedAt: text("invited_at").notNull(),
  joinedAt: text("joined_at"),
}, table => [uniqueIndex("team_members_team_email_unique").on(table.teamId, table.email)]);

export const teamAssignments = sqliteTable("team_assignments", {
  id: text("id").primaryKey(),
  teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  repositoryId: text("repository_id").notNull(),
  repositoryName: text("repository_name").notNull(),
  incidentTemplateId: text("incident_template_id").notNull(),
  incidentName: text("incident_name").notNull(),
  assignedToEmail: text("assigned_to_email").notNull(),
  createdAt: text("created_at").notNull(),
}, table => [index("team_assignments_team_date_idx").on(table.teamId, table.createdAt)]);

export const repositories = sqliteTable("repositories", {
  id: text("id").primaryKey(),
  ownerAccountId: text("owner_account_id").references(() => accounts.id, { onDelete: "cascade" }),
  accessTokenHash: text("access_token_hash").notNull(),
  source: text("source", { enum: ["DEMO", "UPLOAD", "GITHUB_PUBLIC", "GITHUB_CONNECTED"] }).notNull(),
  externalRef: text("external_ref"),
  name: text("name").notNull(),
  analysisJson: text("analysis_json").notNull(),
  objectKey: text("object_key").notNull(),
  fileCount: integer("file_count").notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at"),
}, table => [index("repositories_owner_date_idx").on(table.ownerAccountId, table.createdAt), index("repositories_expiry_idx").on(table.expiresAt)]);

export const rehearsalSessions = sqliteTable("rehearsal_sessions", {
  id: text("id").primaryKey(),
  ownerAccountId: text("owner_account_id").references(() => accounts.id, { onDelete: "cascade" }),
  accessTokenHash: text("access_token_hash").notNull(),
  repositoryId: text("repository_id").notNull(),
  repositoryName: text("repository_name").notNull(),
  incidentTemplateId: text("incident_template_id").notNull(),
  difficulty: text("difficulty", { enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"] }).notNull(),
  mode: text("mode", { enum: ["GUIDED", "INDEPENDENT", "INTERVIEW"] }).notNull(),
  timeLimitMinutes: integer("time_limit_minutes").notNull(),
  status: text("status", { enum: ["PREPARING", "READY", "ACTIVE", "VALIDATING", "COMPLETED", "EXPIRED", "FAILED"] }).notNull(),
  hintCount: integer("hint_count").notNull().default(0),
  hypothesesJson: text("hypotheses_json").notNull().default("[]"),
  timelineJson: text("timeline_json").notNull().default("[]"),
  workspaceKey: text("workspace_key"),
  score: integer("score"),
  validationJson: text("validation_json"),
  reportJson: text("report_json"),
  createdAt: text("created_at").notNull(),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  expiresAt: text("expires_at").notNull(),
}, table => [index("rehearsal_sessions_owner_date_idx").on(table.ownerAccountId, table.createdAt), index("rehearsal_sessions_expiry_idx").on(table.expiresAt, table.status)]);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: integer("window_start").notNull(),
  requestCount: integer("request_count").notNull(),
});
