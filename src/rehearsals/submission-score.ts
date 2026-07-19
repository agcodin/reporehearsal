import type { ValidationResult } from "../types";

export function normalizeSubmissionScore(validation: ValidationResult, workspaceEdited: boolean): ValidationResult {
  if (!workspaceEdited) {
    return { ...validation, passed: false, score: 0, breakdown: validation.breakdown.map(item => ({ ...item, earned: 0 })) };
  }

  const regressed = !validation.passed && validation.checks.some(check => check.status === "failed" && /unsafe|deleted|malformed|removed|credential|isolation/i.test(`${check.name} ${check.detail}`));
  if (!regressed) return validation;

  return { ...validation, passed: false, score: -25, breakdown: validation.breakdown.map(item => ({ ...item, earned: item.label === "Fix quality" ? -25 : 0 })) };
}
