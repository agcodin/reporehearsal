import { describe, expect, it } from "vitest";
import { recommendedTraining, UNLOCK_THRESHOLD } from "../../src/accounts/curriculum";
import type { AccountRehearsal } from "../../src/accounts/types";
import type { IncidentCategory } from "../../src/types";

const rehearsal = (category: IncidentCategory | null, score = 90, status: AccountRehearsal["status"] = "COMPLETED"): AccountRehearsal => ({
  id: crypto.randomUUID(), incidentTemplateId: "x", incidentName: "X", repositoryName: "R", mode: "GUIDED",
  status, score, durationMinutes: 20, hintsUsed: 0, completedAt: "2026-07-20T10:00:00Z", category,
});

describe("adaptive curriculum", () => {
  it("stays locked until the solve threshold is reached", () => {
    const rec = recommendedTraining([rehearsal("database"), rehearsal("database"), rehearsal("database"), rehearsal("database")]);
    expect(rec).toEqual({ unlocked: false, solved: 4, needed: UNLOCK_THRESHOLD });
  });

  it("counts only solved (COMPLETED) rehearsals toward unlocking", () => {
    const four = Array.from({ length: 4 }, () => rehearsal("database"));
    const withFails = [...four, rehearsal("database", 10, "UNRESOLVED"), rehearsal("database", 10, "UNRESOLVED")];
    expect(recommendedTraining(withFails).unlocked).toBe(false);
  });

  it("introduces an untouched category as a new skill once unlocked", () => {
    const rec = recommendedTraining(Array.from({ length: 5 }, () => rehearsal("database")));
    expect(rec).toMatchObject({ unlocked: true, kind: "new", category: "configuration", incidentId: "container-host-config-v1" });
    if (rec.unlocked) expect(rec.reason).toMatch(/not practiced/i);
  });

  it("recommends the lowest-scoring track once every category is covered", () => {
    const history: AccountRehearsal[] = [
      rehearsal("database", 95), rehearsal("database", 90),
      rehearsal("configuration", 60), rehearsal("configuration", 50),
      rehearsal("external_dependency", 80),
    ];
    const rec = recommendedTraining(history);
    expect(rec).toMatchObject({ unlocked: true, kind: "weakness", category: "configuration", averageScore: 55 });
  });

  it("ignores unattributed (pre-migration) rehearsals when scoring coverage", () => {
    const rec = recommendedTraining(Array.from({ length: 5 }, () => rehearsal(null)));
    expect(rec).toMatchObject({ unlocked: true, kind: "new", category: "database" });
  });
});
