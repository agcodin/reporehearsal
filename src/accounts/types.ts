export type AccountMode = "GUIDED" | "INDEPENDENT" | "INTERVIEW";
export type AccountProfile = { id: string; email: string; displayName: string; defaultMode: AccountMode; defaultTimeLimit: number; createdAt: string; updatedAt: string };
export type AccountRehearsal = { id: string; incidentTemplateId: string; incidentName: string; repositoryName: string; mode: AccountMode; status: "COMPLETED" | "UNRESOLVED"; score: number; durationMinutes: number; hintsUsed: number; completedAt: string };
export type AccountDashboard = { profile: AccountProfile; rehearsals: AccountRehearsal[]; metrics: AccountMetrics };
export type AccountMetrics = { completed: number; averageScore: number | null; averageDuration: number | null; completionRate: number | null; topSkillGap: string };
