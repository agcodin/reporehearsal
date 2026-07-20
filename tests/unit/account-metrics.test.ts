import { describe, expect, it } from "vitest";
import { calculateAccountMetrics } from "../../src/accounts/metrics";
import type { AccountRehearsal } from "../../src/accounts/types";

const completed = (overrides: Partial<AccountRehearsal> = {}): AccountRehearsal => ({ id: crypto.randomUUID(), incidentTemplateId: "db-required-field-migration-v1", incidentName: "Required field migration", repositoryName: "Billing Demo", mode: "GUIDED", status: "COMPLETED", score: 90, durationMinutes: 20, hintsUsed: 1, completedAt: "2026-07-15T10:00:00Z", ...overrides });

describe("account readiness metrics", () => {
  it("returns an honest empty state for a new account", () => { expect(calculateAccountMetrics([])).toEqual({ completed: 0, averageScore: null, averageDuration: null, completionRate: null, topSkillGap: "Complete a rehearsal to build your profile", currentStreak: 0, streakIncludesToday: false }); });

  it("counts consecutive practice days as a streak, allowing today to be unpracticed", () => {
    const now = new Date("2026-07-20T09:00:00Z");
    const across = [completed({ completedAt: "2026-07-19T23:00:00Z" }), completed({ completedAt: "2026-07-18T08:00:00Z" }), completed({ completedAt: "2026-07-17T12:00:00Z", status: "UNRESOLVED", score: 20 })];
    expect(calculateAccountMetrics(across, now)).toMatchObject({ currentStreak: 3, streakIncludesToday: false });
    const withToday = [completed({ completedAt: "2026-07-20T07:00:00Z" }), ...across];
    expect(calculateAccountMetrics(withToday, now)).toMatchObject({ currentStreak: 4, streakIncludesToday: true });
  });

  it("breaks the streak when the last practice was before yesterday", () => {
    const now = new Date("2026-07-20T09:00:00Z");
    expect(calculateAccountMetrics([completed({ completedAt: "2026-07-18T09:00:00Z" })], now)).toMatchObject({ currentStreak: 0 });
  });
  it("aggregates only completed sessions into averages", () => { const metrics = calculateAccountMetrics([completed(), completed({ score: 70, durationMinutes: 30 }), completed({ status: "UNRESOLVED", score: 40, durationMinutes: 10 })]); expect(metrics).toMatchObject({ completed: 2, averageScore: 80, averageDuration: 25, completionRate: 67, topSkillGap: "Prevention planning" }); });
  it("uses hint behavior to identify an independence gap", () => { const metrics = calculateAccountMetrics([completed({ hintsUsed: 3 }), completed({ hintsUsed: 2 })]); expect(metrics.topSkillGap).toBe("Independent diagnosis"); });
});
