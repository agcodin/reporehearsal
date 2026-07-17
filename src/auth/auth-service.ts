import { env } from "cloudflare:workers";
import { ensureAccount } from "../accounts/account-service";

export type AuthProvider = "chatgpt" | "google" | "github";

export type AuthenticatedUser = {
  displayName: string;
  email: string;
  fullName: string | null;
  provider: AuthProvider;
};

const LOGIN_ATTEMPT_TTL_MS = 10 * 60_000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

function database(): D1Database {
  if (!env.DB) throw new Error("Authentication database binding is unavailable");
  return env.DB;
}

export async function ensureAuthSchema(): Promise<void> {
  const db = database();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS auth_identities (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_subject TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_signed_in_at TEXT NOT NULL
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS auth_identities_provider_subject_unique ON auth_identities(provider, provider_subject)"),
    db.prepare("CREATE INDEX IF NOT EXISTS auth_identities_account_idx ON auth_identities(account_id)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS auth_login_attempts (
      state_hash TEXT PRIMARY KEY NOT NULL,
      provider TEXT NOT NULL,
      code_verifier TEXT NOT NULL,
      return_to TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS auth_login_attempts_expiry_idx ON auth_login_attempts(expires_at)"),
  ]);
}

export async function createLoginAttempt(provider: Exclude<AuthProvider, "chatgpt">, returnTo: string) {
  await ensureAuthSchema();
  const state = randomToken(32);
  const codeVerifier = randomToken(48);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const expiresAt = new Date(Date.now() + LOGIN_ATTEMPT_TTL_MS).toISOString();
  const db = database();
  await db.batch([
    db.prepare("DELETE FROM auth_login_attempts WHERE expires_at <= ?").bind(new Date().toISOString()),
    db.prepare("INSERT INTO auth_login_attempts (state_hash, provider, code_verifier, return_to, expires_at) VALUES (?, ?, ?, ?, ?)")
      .bind(await sha256Hex(state), provider, codeVerifier, returnTo, expiresAt),
  ]);
  return { state, codeChallenge, maxAgeSeconds: LOGIN_ATTEMPT_TTL_MS / 1000 };
}

export async function consumeLoginAttempt(provider: Exclude<AuthProvider, "chatgpt">, state: string) {
  await ensureAuthSchema();
  const row = await database().prepare(`DELETE FROM auth_login_attempts
    WHERE state_hash = ? AND provider = ? AND expires_at > ?
    RETURNING code_verifier, return_to`)
    .bind(await sha256Hex(state), provider, new Date().toISOString())
    .first<{ code_verifier: string; return_to: string }>();
  return row ? { codeVerifier: row.code_verifier, returnTo: row.return_to } : null;
}

export async function createAuthSession(input: {
  provider: Exclude<AuthProvider, "chatgpt">;
  subject: string;
  email: string;
  displayName: string;
}): Promise<{ token: string; expiresAt: string; user: AuthenticatedUser }> {
  await ensureAuthSchema();
  const db = database();
  const now = new Date().toISOString();
  const existingIdentity = await db.prepare(`SELECT a.id, a.email, a.display_name
    FROM auth_identities i JOIN accounts a ON a.id = i.account_id
    WHERE i.provider = ? AND i.provider_subject = ?`)
    .bind(input.provider, input.subject)
    .first<{ id: string; email: string; display_name: string }>();

  let account = existingIdentity;
  if (account) {
    await db.batch([
      db.prepare("UPDATE accounts SET display_name = ?, updated_at = ? WHERE id = ?").bind(input.displayName, now, account.id),
      db.prepare("UPDATE auth_identities SET last_signed_in_at = ? WHERE provider = ? AND provider_subject = ?").bind(now, input.provider, input.subject),
    ]);
    account = { ...account, display_name: input.displayName };
  } else {
    const profile = await ensureAccount(input.email, input.displayName);
    account = { id: profile.id, email: profile.email, display_name: profile.displayName };
    await db.prepare(`INSERT INTO auth_identities (id, account_id, provider, provider_subject, created_at, last_signed_in_at)
      VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), account.id, input.provider, input.subject, now, now)
      .run();
  }

  const token = randomToken(48);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await db.batch([
    db.prepare("DELETE FROM auth_sessions WHERE expires_at <= ?").bind(now),
    db.prepare("INSERT INTO auth_sessions (token_hash, account_id, provider, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
      .bind(await sha256Hex(token), account.id, input.provider, now, expiresAt),
  ]);
  return {
    token,
    expiresAt,
    user: { email: account.email, displayName: account.display_name, fullName: account.display_name, provider: input.provider },
  };
}

export async function getAuthSession(token: string): Promise<AuthenticatedUser | null> {
  if (!token) return null;
  const row = await database().prepare(`SELECT a.email, a.display_name, s.provider
    FROM auth_sessions s JOIN accounts a ON a.id = s.account_id
    WHERE s.token_hash = ? AND s.expires_at > ?`)
    .bind(await sha256Hex(token), new Date().toISOString())
    .first<{ email: string; display_name: string; provider: "google" | "github" }>();
  if (!row) return null;
  return { email: row.email, displayName: row.display_name, fullName: row.display_name, provider: row.provider };
}

export async function deleteAuthSession(token: string): Promise<void> {
  if (!token) return;
  await database().prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
}

export function randomToken(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

export async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
