import { describe, expect, it } from "vitest";
import { normalizeSubmissionScore } from "../../src/rehearsals/submission-score";
import type { ValidationResult } from "../../src/types";

function validation(score = 41): ValidationResult {
  return {
    passed: false,
    score,
    checks: [{ name: "Incident behavior", status: "failed", detail: "The repair is incomplete." }],
    breakdown: [{ label: "Diagnosis", earned: score, possible: 100 }],
  };
}

describe("submission score normalization", () => {
  it("returns zero only when the saved workspace is unchanged", () => {
    const result = normalizeSubmissionScore(validation(), false);
    expect(result.score).toBe(0);
    expect(result.breakdown[0].earned).toBe(0);
  });

  it("preserves the evaluator score when the saved workspace changed", () => {
    expect(normalizeSubmissionScore(validation(), true).score).toBe(41);
  });

  it("assigns a negative score to an unsafe edited submission", () => {
    const unsafe = validation();
    unsafe.checks = [{ name: "Unsafe shortcut scan", status: "failed", detail: "Isolation was removed." }];
    const result = normalizeSubmissionScore(unsafe, true);
    expect(result.score).toBe(-25);
  });
});
