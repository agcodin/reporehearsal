import { describe, expect, it } from "vitest";
import { skillAverages, weakestSkill, coachingFor } from "../../src/accounts/skill-profile";

const full = (over: Partial<Record<string, number>> = {}) => [
  { label: "Diagnosis", earned: over.Diagnosis ?? 20, possible: 25 },
  { label: "Investigation", earned: over.Investigation ?? 16, possible: 20 },
  { label: "Fix quality", earned: over["Fix quality"] ?? 20, possible: 25 },
  { label: "Verification", earned: over.Verification ?? 4, possible: 15 },
  { label: "Prevention", earned: over.Prevention ?? 8, possible: 10 },
  { label: "Communication", earned: over.Communication ?? 5, possible: 5 },
];

describe("skill profile", () => {
  it("averages each skill as a percentage of its possible points", () => {
    const averages = skillAverages([full(), full({ Verification: 10 })]);
    const verification = averages.find(item => item.label === "Verification");
    expect(verification).toEqual({ label: "Verification", percent: Math.round(((4 / 15 + 10 / 15) / 2) * 100), sampleSize: 2 });
  });

  it("floors negative penalties at zero so a skill reads as a level, not a debt", () => {
    const averages = skillAverages([[{ label: "Fix quality", earned: -25, possible: 25 }]]);
    expect(averages.find(item => item.label === "Fix quality")).toMatchObject({ percent: 0, sampleSize: 1 });
  });

  it("identifies the lowest measured skill and ignores unmeasured ones", () => {
    const weakest = weakestSkill(skillAverages([full()]));
    expect(weakest?.label).toBe("Verification");
    expect(weakestSkill(skillAverages([]))).toBeNull();
  });

  it("gives concrete coaching for each skill", () => {
    expect(coachingFor("Verification")).toMatch(/tests/i);
    expect(coachingFor("Prevention")).toMatch(/regression/i);
  });
});
