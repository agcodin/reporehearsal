import { ensureAccount, ensureAccountSchema } from "../accounts/account-service";
import { runtimeDatabase } from "../storage/runtime";

type DailyUser = { email: string; displayName: string };
type DailyRow = { id: string; session_id: string; display_name: string; score: number; duration_seconds: number; completed_at: string };

export type DailyLeaderboardEntry = { id: string; sessionId: string; displayName: string; score: number; durationSeconds: number; completedAt: string };

export async function ensureDailyLeaderboardSchema() {
  await ensureAccountSchema();
  const db = runtimeDatabase();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS daily_leaderboard_entries (
      id TEXT PRIMARY KEY NOT NULL,
      date_key TEXT NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL UNIQUE REFERENCES rehearsal_sessions(id) ON DELETE CASCADE,
      display_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      duration_seconds INTEGER NOT NULL,
      completed_at TEXT NOT NULL
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS daily_leaderboard_account_date_unique ON daily_leaderboard_entries(date_key, account_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS daily_leaderboard_rank_idx ON daily_leaderboard_entries(date_key, score DESC, duration_seconds ASC)"),
  ]);
}

function fromDailyRow(row: DailyRow): DailyLeaderboardEntry {
  return { id: row.id, sessionId: row.session_id, displayName: row.display_name, score: row.score, durationSeconds: row.duration_seconds, completedAt: row.completed_at };
}

export async function recordDailyLeaderboardResult(user: DailyUser | null, input: { sessionId: string; dateKey: string; score: number; durationSeconds: number; completedAt: string }) {
  if (!user) return { counted: false, reason: "SIGN_IN_REQUIRED" as const };
  await ensureDailyLeaderboardSchema();
  const account = await ensureAccount(user.email, user.displayName);
  const result = await runtimeDatabase().prepare(`INSERT INTO daily_leaderboard_entries
    (id, date_key, account_id, session_id, display_name, score, duration_seconds, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(date_key, account_id) DO NOTHING`)
    .bind(crypto.randomUUID(), input.dateKey, account.id, input.sessionId, account.displayName, input.score, input.durationSeconds, input.completedAt).run();
  return { counted: Boolean(result.meta?.changes), reason: result.meta?.changes ? "FIRST_ATTEMPT" as const : "REPLAY" as const };
}

export async function getDailyLeaderboard(dateKey: string, user: DailyUser | null = null) {
  await ensureDailyLeaderboardSchema();
  const db = runtimeDatabase();
  const result = await db.prepare(`SELECT id, session_id, display_name, score, duration_seconds, completed_at
    FROM daily_leaderboard_entries WHERE date_key = ? ORDER BY score DESC, duration_seconds ASC, completed_at ASC LIMIT 100`).bind(dateKey).all<DailyRow>();
  const count = await db.prepare("SELECT COUNT(*) AS count FROM daily_leaderboard_entries WHERE date_key = ?").bind(dateKey).first<{ count: number }>();
  let viewerEntry: DailyLeaderboardEntry | null = null;
  if (user) {
    const account = await ensureAccount(user.email, user.displayName);
    const row = await db.prepare(`SELECT id, session_id, display_name, score, duration_seconds, completed_at
      FROM daily_leaderboard_entries WHERE date_key = ? AND account_id = ?`).bind(dateKey, account.id).first<DailyRow>();
    viewerEntry = row ? fromDailyRow(row) : null;
  }
  return { entries: (result.results ?? []).map(fromDailyRow), participantCount: count?.count ?? 0, viewerEntry };
}

export async function getDailyLeaderboardEntryForSession(sessionId: string) {
  await ensureDailyLeaderboardSchema();
  const row = await runtimeDatabase().prepare(`SELECT id, session_id, display_name, score, duration_seconds, completed_at
    FROM daily_leaderboard_entries WHERE session_id = ?`).bind(sessionId).first<DailyRow>();
  return row ? fromDailyRow(row) : null;
}
