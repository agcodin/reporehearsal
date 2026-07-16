import { describe, expect, it } from "vitest";
import { isPlanId, planFor, planRank, plans } from "../../src/billing/plans";

describe("plan catalog", () => {
  it("keeps the four plans in increasing entitlement order", () => {
    expect(plans.map(plan => plan.id)).toEqual(["FREE", "PRO", "TEAM", "ENTERPRISE"]);
    expect(planRank.FREE).toBeLessThan(planRank.PRO);
    expect(planRank.PRO).toBeLessThan(planRank.TEAM);
    expect(planRank.TEAM).toBeLessThan(planRank.ENTERPRISE);
  });

  it("validates persisted plan identifiers safely", () => {
    expect(isPlanId("TEAM")).toBe(true);
    expect(isPlanId("ULTIMATE")).toBe(false);
    expect(planFor("PRO").price).toBe("$19");
  });
});
