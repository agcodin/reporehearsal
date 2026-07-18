import { ensureAccount } from "../accounts/account-service";
import { repositoryMap, injectedBillingSource } from "../data";
import { accessToken, repositoryBucket, runtimeDatabase, sha256 } from "../storage/runtime";
import type { StoredRepository, WorkspaceFile, RepositorySource } from "../rehearsals/types";
import { DAILY_REPOSITORY_ID } from "../rehearsals/daily";

export type RepositoryUser = { email: string; displayName: string } | null;
type RepositoryRow = { id: string; owner_account_id: string | null; access_token_hash: string; source: RepositorySource; external_ref: string | null; name: string; analysis_json: string; object_key: string; file_count: number; created_at: string; expires_at: string | null };

const demoFiles: WorkspaceFile[] = [
  { path: "package.json", content: JSON.stringify({ scripts: { test: "vitest run", lint: "eslint .", build: "tsc" }, dependencies: { express: "5", "@prisma/client": "6" }, devDependencies: { typescript: "5", vitest: "3" } }, null, 2) },
  { path: "src/services/billing.ts", content: injectedBillingSource },
  { path: "src/server.ts", content: "import express from 'express';\nexport const app = express();" },
  { path: "prisma/schema.prisma", content: "datasource db { provider = \"postgresql\" url = env(\"DATABASE_URL\") }\nmodel BillingProfile { id String @id billingRegion String }" },
  { path: "prisma/migrations/202606121410_add_billing_region/migration.sql", content: "ALTER TABLE billing_profiles ADD COLUMN billing_region TEXT;\nALTER TABLE billing_profiles ALTER COLUMN billing_region SET NOT NULL;" },
  { path: "tests/billing.test.ts", content: "describe('billing', () => { it('loads existing accounts', () => {}); });" },
  { path: "docker-compose.yml", content: "services:\n  billing-api:\n    environment:\n      DATABASE_URL: postgresql://rehearsal:rehearsal@postgres:5432/billing\n  postgres:\n    image: postgres:16" },
  { path: ".env.example", content: "DATABASE_URL=postgresql://rehearsal:rehearsal@postgres:5432/billing\nPORT=3001" },
];
const dailyFiles: WorkspaceFile[] = [
  { path: "src/services/billing.ts", content: injectedBillingSource },
  { path: ".env.rehearsal", content: "DATABASE_URL=postgresql://rehearsal:rehearsal@postgres:5432/billing\nPORT=3001" },
  { path: "src/services/provider-client.ts", content: "export function normalizeProvider(payload: { status?: string }) { return { status: (payload.status ?? 'unknown').toUpperCase() }; }" },
  { path: "src/services/webhook-handler.ts", content: "export async function handleWebhook(event: ProviderEvent, signature: string) { verifyWebhook(signature, event); const existing = await prisma.charge.findUnique({ where: { providerEventId: event.id } }); if (existing) return existing; return prisma.charge.create({ data: { providerEventId: event.id, amount: event.amount } }); }" },
  { path: "tests/incident.test.ts", content: "describe('incident contract', () => { it('preserves the production boundary', () => {}); });" },
];

export async function ensureRepositorySchema() {
  const db = runtimeDatabase();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS repositories (
      id TEXT PRIMARY KEY NOT NULL, owner_account_id TEXT, access_token_hash TEXT NOT NULL, source TEXT NOT NULL,
      external_ref TEXT, name TEXT NOT NULL, analysis_json TEXT NOT NULL, object_key TEXT NOT NULL,
      file_count INTEGER NOT NULL, created_at TEXT NOT NULL, expires_at TEXT,
      FOREIGN KEY (owner_account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS repositories_owner_date_idx ON repositories(owner_account_id, created_at DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS repositories_expiry_idx ON repositories(expires_at)"),
  ]);
}

function fromRow(row: RepositoryRow): StoredRepository { return { id: row.id, ownerAccountId: row.owner_account_id, source: row.source, externalRef: row.external_ref, name: row.name, analysis: JSON.parse(row.analysis_json) as Record<string, unknown>, objectKey: row.object_key, fileCount: row.file_count, createdAt: row.created_at, expiresAt: row.expires_at }; }
async function accountId(user: Exclude<RepositoryUser, null>): Promise<string> { return (await ensureAccount(user.email, user.displayName)).id; }

export async function saveRepository(user: RepositoryUser, input: { id?: string; source: Exclude<RepositorySource, "DEMO">; externalRef: string | null; name: string; analysis: Record<string, unknown>; files: WorkspaceFile[] }) {
  await ensureRepositorySchema();
  const id = input.id ?? crypto.randomUUID(); const token = accessToken(); const now = new Date();
  const ownerAccountId = user ? await accountId(user) : null;
  const expiresAt = ownerAccountId ? null : new Date(now.getTime() + 24 * 60 * 60_000).toISOString();
  const objectKey = `repositories/${id}/source.json`;
  await repositoryBucket().put(objectKey, JSON.stringify({ version: 1, files: input.files }), { httpMetadata: { contentType: "application/json" }, customMetadata: { repositoryId: id, expiresAt: expiresAt ?? "account-owned" } });
  await runtimeDatabase().prepare(`INSERT INTO repositories (id, owner_account_id, access_token_hash, source, external_ref, name, analysis_json, object_key, file_count, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, ownerAccountId, await sha256(token), input.source, input.externalRef, input.name, JSON.stringify(input.analysis), objectKey, input.files.length, now.toISOString(), expiresAt).run();
  return { repository: { id, ownerAccountId, source: input.source, externalRef: input.externalRef, name: input.name, analysis: input.analysis, objectKey, fileCount: input.files.length, createdAt: now.toISOString(), expiresAt } satisfies StoredRepository, accessToken: token };
}

export async function getRepository(id: string, user: RepositoryUser, token?: string | null): Promise<StoredRepository> {
  if (id === repositoryMap.repositoryId) return { id, ownerAccountId: null, source: "DEMO", externalRef: null, name: repositoryMap.name, analysis: repositoryMap as unknown as Record<string, unknown>, objectKey: "builtin://billing-demo", fileCount: demoFiles.length, createdAt: "2026-07-15T00:00:00.000Z", expiresAt: null };
  if (id === DAILY_REPOSITORY_ID) return { id, ownerAccountId: null, source: "DEMO", externalRef: null, name: "Challenge of the Day", analysis: { daily: true, fileCount: 5 }, objectKey: "builtin://repository-of-the-day", fileCount: dailyFiles.length, createdAt: new Date().toISOString(), expiresAt: null };
  await ensureRepositorySchema();
  const row = await runtimeDatabase().prepare("SELECT id, owner_account_id, access_token_hash, source, external_ref, name, analysis_json, object_key, file_count, created_at, expires_at FROM repositories WHERE id = ?").bind(id).first<RepositoryRow>();
  if (!row) throw new RepositoryAccessError("NOT_FOUND", "Repository not found.", 404);
  if (row.expires_at && Date.parse(row.expires_at) <= Date.now()) { await repositoryBucket().delete(row.object_key); await runtimeDatabase().prepare("DELETE FROM repositories WHERE id = ?").bind(id).run(); throw new RepositoryAccessError("EXPIRED", "This anonymous repository upload has expired.", 410); }
  const owned = user ? row.owner_account_id === await accountId(user) : false;
  const tokenMatches = token ? await sha256(token) === row.access_token_hash : false;
  if (!owned && !tokenMatches) throw new RepositoryAccessError("FORBIDDEN", "Repository access is not authorized.", 403);
  return fromRow(row);
}

export async function loadRepositoryFiles(repository: StoredRepository): Promise<WorkspaceFile[]> {
  if (repository.id === DAILY_REPOSITORY_ID) return dailyFiles.map(file => ({ ...file }));
  if (repository.source === "DEMO") return demoFiles.map(file => ({ ...file }));
  const object = await repositoryBucket().get(repository.objectKey);
  if (!object) throw new RepositoryAccessError("SOURCE_MISSING", "The stored repository source is unavailable.", 410);
  const parsed = JSON.parse(await object.text()) as { files?: WorkspaceFile[] };
  if (!Array.isArray(parsed.files)) throw new RepositoryAccessError("SOURCE_INVALID", "The stored repository source is invalid.", 500);
  return parsed.files;
}

export async function listRepositories(user: RepositoryUser): Promise<StoredRepository[]> {
  const demo = await getRepository(repositoryMap.repositoryId, null);
  if (!user) return [demo];
  await ensureRepositorySchema(); const owner = await accountId(user);
  const result = await runtimeDatabase().prepare("SELECT id, owner_account_id, access_token_hash, source, external_ref, name, analysis_json, object_key, file_count, created_at, expires_at FROM repositories WHERE owner_account_id = ? ORDER BY created_at DESC LIMIT 50").bind(owner).all<RepositoryRow>();
  return [demo, ...(result.results ?? []).map(fromRow)];
}

export async function cleanupExpiredRepositories() {
  await ensureRepositorySchema(); const now = new Date().toISOString();
  const result = await runtimeDatabase().prepare("SELECT id, object_key FROM repositories WHERE expires_at IS NOT NULL AND expires_at <= ? LIMIT 100").bind(now).all<{ id: string; object_key: string }>();
  for (const row of result.results ?? []) { await repositoryBucket().delete(row.object_key); await runtimeDatabase().prepare("DELETE FROM repositories WHERE id = ?").bind(row.id).run(); }
  return result.results?.length ?? 0;
}

export async function deleteRepository(id: string, user: RepositoryUser, token?: string | null) {
  if (id === repositoryMap.repositoryId) throw new RepositoryAccessError("DEMO_IMMUTABLE", "The built-in demo repository cannot be deleted.", 403);
  const repository = await getRepository(id, user, token);
  await repositoryBucket().delete(repository.objectKey);
  await runtimeDatabase().prepare("DELETE FROM repositories WHERE id = ?").bind(id).run();
  if (repository.ownerAccountId) await runtimeDatabase().prepare("DELETE FROM account_repositories WHERE id = ? AND account_id = ?").bind(id, repository.ownerAccountId).run();
}

export class RepositoryAccessError extends Error { constructor(public readonly code: string, message: string, public readonly status: number) { super(message); } }
