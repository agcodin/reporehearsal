import { env } from "cloudflare:workers";
import { calculateAccountMetrics } from "./metrics";
import type { AccountDashboard, AccountMode, AccountProfile, AccountRehearsal, AccountRepository } from "./types";

function database(): D1Database {
  if (!env.DB) throw new Error("Account database binding is unavailable");
  return env.DB;
}

export async function ensureAccountSchema() {
  const db = database();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      default_mode TEXT NOT NULL DEFAULT 'GUIDED',
      default_time_limit INTEGER NOT NULL DEFAULT 25,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS account_rehearsals (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      incident_template_id TEXT NOT NULL,
      incident_name TEXT NOT NULL,
      repository_name TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL,
      score INTEGER NOT NULL,
      duration_minutes INTEGER NOT NULL,
      hints_used INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS account_rehearsals_owner_date_idx ON account_rehearsals(account_id, completed_at DESC)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS account_repositories (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      source TEXT NOT NULL,
      external_id TEXT,
      name TEXT NOT NULL,
      display_ref TEXT NOT NULL,
      language TEXT NOT NULL,
      framework TEXT NOT NULL,
      database TEXT NOT NULL,
      orm TEXT NOT NULL,
      test_framework TEXT NOT NULL,
      package_manager TEXT NOT NULL,
      file_count INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS account_repositories_owner_date_idx ON account_repositories(account_id, updated_at DESC)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS account_repositories_source_unique ON account_repositories(account_id, source, external_id)"),
  ]);
}

type AccountRow = { id: string; email: string; display_name: string; default_mode: AccountMode; default_time_limit: number; created_at: string; updated_at: string };
type RehearsalRow = { id: string; incident_template_id: string; incident_name: string; repository_name: string; mode: AccountMode; status: "COMPLETED" | "UNRESOLVED"; score: number; duration_minutes: number; hints_used: number; completed_at: string };
type RepositoryRow = { id: string; source: AccountRepository["source"]; external_id: string | null; name: string; display_ref: string; language: string; framework: string; database: string; orm: string; test_framework: string; package_manager: string; file_count: number; created_at: string; updated_at: string };

function profileFromRow(row: AccountRow): AccountProfile { return { id: row.id, email: row.email, displayName: row.display_name, defaultMode: row.default_mode, defaultTimeLimit: row.default_time_limit, createdAt: row.created_at, updatedAt: row.updated_at }; }
function rehearsalFromRow(row: RehearsalRow): AccountRehearsal { return { id: row.id, incidentTemplateId: row.incident_template_id, incidentName: row.incident_name, repositoryName: row.repository_name, mode: row.mode, status: row.status, score: row.score, durationMinutes: row.duration_minutes, hintsUsed: row.hints_used, completedAt: row.completed_at }; }
function repositoryFromRow(row: RepositoryRow): AccountRepository { return { id: row.id, source: row.source, externalId: row.external_id, name: row.name, displayRef: row.display_ref, language: row.language, framework: row.framework, database: row.database, orm: row.orm, testFramework: row.test_framework, packageManager: row.package_manager, fileCount: row.file_count, createdAt: row.created_at, updatedAt: row.updated_at }; }

export async function ensureAccount(email: string, displayName: string): Promise<AccountProfile> {
  await ensureAccountSchema();
  const db = database(); const now = new Date().toISOString();
  await db.prepare("INSERT INTO accounts (id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET display_name = excluded.display_name, updated_at = excluded.updated_at").bind(crypto.randomUUID(), email.toLowerCase(), displayName, now, now).run();
  const row = await db.prepare("SELECT id, email, display_name, default_mode, default_time_limit, created_at, updated_at FROM accounts WHERE email = ?").bind(email.toLowerCase()).first<AccountRow>();
  if (!row) throw new Error("Account could not be loaded");
  return profileFromRow(row);
}

export async function getAccountDashboard(email: string, displayName: string): Promise<AccountDashboard> {
  const profile = await ensureAccount(email, displayName); const db = database();
  const result = await db.prepare("SELECT id, incident_template_id, incident_name, repository_name, mode, status, score, duration_minutes, hints_used, completed_at FROM account_rehearsals WHERE account_id = ? ORDER BY completed_at DESC LIMIT 50").bind(profile.id).all<RehearsalRow>();
  const repositoryResult = await db.prepare("SELECT id, source, external_id, name, display_ref, language, framework, database, orm, test_framework, package_manager, file_count, created_at, updated_at FROM account_repositories WHERE account_id = ? ORDER BY updated_at DESC LIMIT 50").bind(profile.id).all<RepositoryRow>();
  const rehearsals = (result.results ?? []).map(rehearsalFromRow);
  const repositories = (repositoryResult.results ?? []).map(repositoryFromRow);
  return { profile, rehearsals, repositories, metrics: calculateAccountMetrics(rehearsals) };
}

export async function updateAccountPreferences(email: string, displayName: string, input: { defaultMode: AccountMode; defaultTimeLimit: number }): Promise<AccountProfile> {
  const profile = await ensureAccount(email, displayName); const now = new Date().toISOString();
  await database().prepare("UPDATE accounts SET default_mode = ?, default_time_limit = ?, updated_at = ? WHERE id = ?").bind(input.defaultMode, input.defaultTimeLimit, now, profile.id).run();
  return { ...profile, ...input, updatedAt: now };
}

export async function saveAccountRehearsal(email: string, displayName: string, input: Omit<AccountRehearsal, "completedAt"> & { completedAt?: string }) {
  const profile = await ensureAccount(email, displayName); const now = new Date().toISOString(); const completedAt = input.completedAt ?? now;
  await database().prepare(`INSERT INTO account_rehearsals (id, account_id, incident_template_id, incident_name, repository_name, mode, status, score, duration_minutes, hints_used, completed_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`).bind(input.id, profile.id, input.incidentTemplateId, input.incidentName, input.repositoryName, input.mode, input.status, input.score, input.durationMinutes, input.hintsUsed, completedAt, now).run();
  return { ...input, completedAt };
}

export async function saveAccountRepository(email: string, displayName: string, input: Omit<AccountRepository, "createdAt" | "updatedAt">) {
  const profile = await ensureAccount(email, displayName); const now = new Date().toISOString();
  await database().prepare(`INSERT INTO account_repositories (id, account_id, source, external_id, name, display_ref, language, framework, database, orm, test_framework, package_manager, file_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(account_id, source, external_id) DO UPDATE SET name = excluded.name, display_ref = excluded.display_ref, language = excluded.language, framework = excluded.framework, database = excluded.database, orm = excluded.orm, test_framework = excluded.test_framework, package_manager = excluded.package_manager, file_count = excluded.file_count, updated_at = excluded.updated_at`).bind(input.id, profile.id, input.source, input.externalId, input.name, input.displayRef, input.language, input.framework, input.database, input.orm, input.testFramework, input.packageManager, input.fileCount, now, now).run();
  return { ...input, createdAt: now, updatedAt: now };
}
