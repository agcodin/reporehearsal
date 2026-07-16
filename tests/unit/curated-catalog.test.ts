import { describe, expect, it } from "vitest";
import { curatedRepositories } from "../../src/repositories/curated-catalog";

describe("curated repository catalog", () => {
  it("contains at least 100 unique, bounded public GitHub projects", () => {
    expect(curatedRepositories.length).toBeGreaterThanOrEqual(100);
    expect(new Set(curatedRepositories.map(repository => repository.fullName)).size).toBe(curatedRepositories.length);
    for (const repository of curatedRepositories) {
      expect(repository.url).toBe(`https://github.com/${repository.fullName}`);
      expect(repository.sizeKb).toBeLessThanOrEqual(20_000);
      expect(repository.license).toBeTruthy();
      expect(repository.description.length).toBeGreaterThan(10);
    }
  });
});
