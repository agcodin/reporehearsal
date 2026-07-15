import type { AccountMode } from "../accounts/types";
import type { ValidationResult } from "../types";

export type WorkspaceFile = { path: string; content: string };
export type RepositorySource = "DEMO" | "UPLOAD" | "GITHUB_PUBLIC" | "GITHUB_CONNECTED";
export type StoredRepository = {
  id: string; ownerAccountId: string | null; source: RepositorySource; externalRef: string | null; name: string;
  analysis: Record<string, unknown>; objectKey: string; fileCount: number; createdAt: string; expiresAt: string | null;
};
export type RehearsalStatus = "PREPARING" | "READY" | "ACTIVE" | "VALIDATING" | "COMPLETED" | "EXPIRED" | "FAILED";
export type TimelineEvent = { type: string; timestamp: string; summary: string; path?: string; commandId?: string };
export type RehearsalSession = {
  id: string; repositoryId: string; repositoryName: string; incidentTemplateId: string; difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  mode: AccountMode; timeLimitMinutes: number; status: RehearsalStatus; hintCount: number; hypotheses: string[]; timeline: TimelineEvent[];
  workspaceKey: string | null; ownerAccountId: string | null; createdAt: string; startedAt: string | null; completedAt: string | null; expiresAt: string;
  score: number | null; validation: ValidationResult | null; report: RehearsalReport | null;
};
export type RehearsalReport = {
  title: string; rootCause: string; summary: string; evidenceUsed: string[]; missedEvidence: string[]; prevention: string[];
  score: number; passed: boolean; markdown: string; aiEnhanced: boolean;
};
