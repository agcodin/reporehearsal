import { describe, expect, it } from "vitest";
import { dailyChallenge } from "../../src/rehearsals/daily";

describe("repository of the day", () => {
  it("returns the same bounded challenge for everyone on a UTC date", () => {
    const first = dailyChallenge(new Date("2026-07-18T01:00:00.000Z"));
    const second = dailyChallenge(new Date("2026-07-18T23:59:59.000Z"));
    expect(first).toEqual(second);
    expect(first.fileCount).toBe(5);
    expect(first.repositoryId).toBe("repository-of-the-day");
  });
});
