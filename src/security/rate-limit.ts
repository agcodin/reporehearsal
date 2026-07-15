import { runtimeDatabase, sha256 } from "../storage/runtime";

export class RateLimitError extends Error {
  constructor(public readonly retryAfter: number) { super("Too many requests. Try again shortly."); }
}

export async function consumeRateLimit(request: Request, scope: string, limit: number, windowSeconds: number) {
  const db = runtimeDatabase();
  await db.prepare("CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY NOT NULL, window_start INTEGER NOT NULL, request_count INTEGER NOT NULL)").run();
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const agent = request.headers.get("user-agent")?.slice(0, 120) ?? "unknown";
  const key = `${scope}:${await sha256(`${ip}:${agent}`)}`;
  const now = Math.floor(Date.now() / 1000); const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  await db.prepare(`INSERT INTO rate_limits (key, window_start, request_count) VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET window_start = CASE WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.window_start ELSE excluded.window_start END,
    request_count = CASE WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.request_count + 1 ELSE 1 END`).bind(key, windowStart).run();
  const row = await db.prepare("SELECT request_count FROM rate_limits WHERE key = ?").bind(key).first<{ request_count: number }>();
  if ((row?.request_count ?? 1) > limit) throw new RateLimitError(Math.max(1, windowStart + windowSeconds - now));
}
