import { describe, expect, it } from "vitest";
import { auditIncidentMatrix } from "../../src/incidents/quality";
import { builtInSamples } from "../../src/repositories/sample-fixtures";

describe("generated incident content quality", () => {
  const matrix = auditIncidentMatrix(builtInSamples);
  it("audits 18 incidents across six language tracks", () => {
    expect(matrix).toHaveLength(18);
    expect(new Set(Object.values(builtInSamples).map(sample => sample.language)).size).toBe(6);
  });
  for (const result of matrix) it(`${result.repositoryId} ${result.difficulty} passes the quality gate`, () => {
    expect(result.findings).toEqual([]);
  });
});
