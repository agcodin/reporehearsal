import { describe, expect, it } from "vitest";
import { isPlanId, planFor, planRank, plans, priceForCadence } from "../../src/billing/plans";

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

  it("offers the requested weekly prices", () => {
    expect(priceForCadence(planFor("PRO"), "weekly")).toEqual({ price: "$3", cadence: "per week" });
    expect(priceForCadence(planFor("TEAM"), "weekly")).toEqual({ price: "$6", cadence: "per week" });
    expect(priceForCadence(planFor("FREE"), "weekly")).toEqual({ price: "$0", cadence: "forever" });
  });
});
