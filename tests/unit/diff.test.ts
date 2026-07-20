import { describe, expect, it } from "vitest";
import { lineDiff, diffStats, diffToMarkdown } from "../../src/rehearsals/diff";

describe("line diff", () => {
  it("marks a single changed line as one removal and one addition", () => {
    const rows = lineDiff("const a = 1;\nconst b = 2;", "const a = 1;\nconst b = 3;");
    expect(rows).toEqual([
      { kind: "same", text: "const a = 1;" },
      { kind: "remove", text: "const b = 2;" },
      { kind: "add", text: "const b = 3;" },
    ]);
    expect(diffStats(rows)).toEqual({ added: 1, removed: 1 });
  });

  it("reports no changes for identical input", () => {
    const rows = lineDiff("same\nlines", "same\nlines");
    expect(diffStats(rows)).toEqual({ added: 0, removed: 0 });
    expect(rows.every(row => row.kind === "same")).toBe(true);
  });

  it("keeps surrounding context when a line is inserted", () => {
    const rows = lineDiff("a\nc", "a\nb\nc");
    expect(rows).toEqual([
      { kind: "same", text: "a" },
      { kind: "add", text: "b" },
      { kind: "same", text: "c" },
    ]);
  });

  it("renders a fenced diff block for the Markdown export", () => {
    const rows = lineDiff("old", "new");
    expect(diffToMarkdown(rows)).toBe("```diff\n-old\n+new\n```");
  });
});
