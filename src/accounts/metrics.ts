import type { AccountMetrics, AccountRehearsal } from "./types";

export function calculateAccountMetrics(rehearsals: AccountRehearsal[]): AccountMetrics {
  if (rehearsals.length === 0) return { completed: 0, averageScore: null, averageDuration: null, completionRate: null, topSkillGap: "Complete a rehearsal to build your profile" };
  const completed = rehearsals.filter(item => item.status === "COMPLETED");
  const averageScore = completed.length ? Math.round(completed.reduce((sum, item) => sum + item.score, 0) / completed.length) : null;
  const averageDuration = completed.length ? Math.round(completed.reduce((sum, item) => sum + item.durationMinutes, 0) / completed.length) : null;
  const completionRate = Math.round((completed.length / rehearsals.length) * 100);
  const averageHints = completed.length ? completed.reduce((sum, item) => sum + item.hintsUsed, 0) / completed.length : 0;
  return { completed: completed.length, averageScore, averageDuration, completionRate, topSkillGap: averageHints > 1.5 ? "Independent diagnosis" : averageScore !== null && averageScore < 75 ? "Verification depth" : "Prevention planning" };
}
