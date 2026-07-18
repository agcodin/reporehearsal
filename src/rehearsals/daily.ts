import { incidents } from "../data";

export const DAILY_REPOSITORY_ID = "repository-of-the-day";

export function dailyChallenge(date = new Date()) {
  const dateKey = date.toISOString().slice(0, 10);
  const dayNumber = Math.floor(Date.parse(`${dateKey}T00:00:00.000Z`) / 86_400_000);
  const incident = incidents[Math.abs(dayNumber) % incidents.length];
  return { dateKey, repositoryId: DAILY_REPOSITORY_ID, repositoryName: "Repository of the Day", incident, difficulty: incident.difficulty.toUpperCase() as "BEGINNER" | "INTERMEDIATE" | "ADVANCED", mode: "INDEPENDENT" as const, timeLimitMinutes: incident.difficulty === "advanced" ? 45 : incident.difficulty === "beginner" ? 20 : 30, fileCount: 5 };
}
