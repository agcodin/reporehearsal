import { describe, expect, it } from "vitest";
import { isPlanId, planFor, planRank, plans } from "../../src/billing/plans";

describe("plan catalog", () => {
  it("keeps the three plans in increasing entitlement order", () => {
    expect(plans.map(plan => plan.id)).toEqual(["FREE", "PRO", "TEAM"]);
    expect(planRank.FREE).toBeLessThan(planRank.PRO);
    expect(planRank.PRO).toBeLessThan(planRank.TEAM);
    expect(planFor("TEAM").limits.repositoryUploadBytes).toBeNull();
  });

  it("validates persisted plan identifiers safely", () => {
    expect(isPlanId("TEAM")).toBe(true);
    expect(isPlanId("ULTIMATE")).toBe(false);
    expect(planFor("PRO").price).toBe("$9.99");
    expect(planFor("PRO").limits.repositoryUploadBytes).toBe(75 * 1024 * 1024);
    expect(planFor("TEAM").price).toBe("$19.99");
  });
});
