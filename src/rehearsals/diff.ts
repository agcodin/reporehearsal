export type DiffRow = { kind: "same" | "add" | "remove"; text: string };

// LCS line diff. Inputs are single rehearsal workspace files (capped at 500 KB
// upstream), so the O(n*m) table stays small enough to build eagerly.
export function lineDiff(before: string, after: string): DiffRow[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { rows.push({ kind: "same", text: a[i] }); i += 1; j += 1; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) { rows.push({ kind: "remove", text: a[i] }); i += 1; }
    else { rows.push({ kind: "add", text: b[j] }); j += 1; }
  }
  while (i < n) { rows.push({ kind: "remove", text: a[i] }); i += 1; }
  while (j < m) { rows.push({ kind: "add", text: b[j] }); j += 1; }
  return rows;
}

export function diffStats(rows: DiffRow[]): { added: number; removed: number } {
  return { added: rows.filter(row => row.kind === "add").length, removed: rows.filter(row => row.kind === "remove").length };
}

// A ```diff fenced block for the Markdown export.
export function diffToMarkdown(rows: DiffRow[]): string {
  const body = rows.map(row => `${row.kind === "add" ? "+" : row.kind === "remove" ? "-" : " "}${row.text}`).join("\n");
  return `\`\`\`diff\n${body}\n\`\`\``;
}
