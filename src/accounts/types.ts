import type { SkillBreakdownItem } from "./skill-profile";
export type AccountMode = "GUIDED" | "INDEPENDENT" | "INTERVIEW";
export type AccountProfile = { id: string; email: string; displayName: string; defaultMode: AccountMode; defaultTimeLimit: number; createdAt: string; updatedAt: string };
export type AccountRehearsal = { id: string; incidentTemplateId: string; incidentName: string; repositoryName: string; mode: AccountMode; status: "COMPLETED" | "UNRESOLVED"; score: number; durationMinutes: number; hintsUsed: number; completedAt: string; breakdown?: SkillBreakdownItem[] | null };
export type AccountRepository = { id: string; source: "UPLOAD" | "GITHUB_PUBLIC" | "GITHUB_CONNECTED"; externalId: string | null; name: string; displayRef: string; language: string; framework: string; database: string; orm: string; testFramework: string; packageManager: string; fileCount: number; createdAt: string; updatedAt: string };
export type AccountDashboard = { profile: AccountProfile; rehearsals: AccountRehearsal[]; repositories: AccountRepository[]; metrics: AccountMetrics };
export type AccountMetrics = { completed: number; averageScore: number | null; averageDuration: number | null; completionRate: number | null; topSkillGap: string; currentStreak: number; streakIncludesToday: boolean };
