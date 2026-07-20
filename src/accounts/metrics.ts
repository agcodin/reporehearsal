import type { AccountMetrics, AccountRehearsal } from "./types";

const MS_PER_DAY = 86_400_000;
function dayKey(ms: number): string { return new Date(ms).toISOString().slice(0, 10); }

// Consecutive UTC days ending today (or yesterday, so a day not yet practiced does not read as
// broken) on which the account finished any rehearsal. Practicing counts even if unresolved.
function streakFor(rehearsals: AccountRehearsal[], now: Date): { currentStreak: number; streakIncludesToday: boolean } {
  const days = new Set(rehearsals.map(item => Date.parse(item.completedAt)).filter(Number.isFinite).map(dayKey));
  const todayKey = dayKey(now.getTime());
  const streakIncludesToday = days.has(todayKey);
  let cursorMs: number;
  if (streakIncludesToday) cursorMs = Date.parse(`${todayKey}T00:00:00.000Z`);
  else if (days.has(dayKey(now.getTime() - MS_PER_DAY))) cursorMs = Date.parse(`${dayKey(now.getTime() - MS_PER_DAY)}T00:00:00.000Z`);
  else return { currentStreak: 0, streakIncludesToday: false };
  let currentStreak = 0;
  while (days.has(dayKey(cursorMs))) { currentStreak += 1; cursorMs -= MS_PER_DAY; }
  return { currentStreak, streakIncludesToday };
}

export function calculateAccountMetrics(rehearsals: AccountRehearsal[], now: Date = new Date()): AccountMetrics {
  if (rehearsals.length === 0) return { completed: 0, averageScore: null, averageDuration: null, completionRate: null, topSkillGap: "Complete a rehearsal to build your profile", currentStreak: 0, streakIncludesToday: false };
  const completed = rehearsals.filter(item => item.status === "COMPLETED");
  const averageScore = completed.length ? Math.round(completed.reduce((sum, item) => sum + item.score, 0) / completed.length) : null;
  const averageDuration = completed.length ? Math.round(completed.reduce((sum, item) => sum + item.durationMinutes, 0) / completed.length) : null;
  const completionRate = Math.round((completed.length / rehearsals.length) * 100);
  const averageHints = completed.length ? completed.reduce((sum, item) => sum + item.hintsUsed, 0) / completed.length : 0;
  return { completed: completed.length, averageScore, averageDuration, completionRate, topSkillGap: averageHints > 1.5 ? "Independent diagnosis" : averageScore !== null && averageScore < 75 ? "Verification depth" : "Prevention planning", ...streakFor(rehearsals, now) };
}
