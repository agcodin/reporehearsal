import { describe, expect, it } from "vitest";
import { assignmentStartPath } from "../../src/team/assignment-link";

describe("team assignment routing", () => {
  it("opens the shared daily challenge through its canonical page", () => {
    expect(assignmentStartPath("challenge-of-the-day", "ignored")).toBe("/daily");
  });

  it("preserves the manager-selected repository and incident", () => {
    expect(assignmentStartPath("repo/with spaces", "provider-schema-drift-v1"))
      .toBe("/rehearsals/new?repositoryId=repo%2Fwith%20spaces&incidentId=provider-schema-drift-v1");
  });
});
