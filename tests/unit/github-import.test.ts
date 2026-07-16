import { describe, expect, it } from "vitest";
import { importPublicGitHubRepository, parseGitHubRepositoryUrl } from "../../src/repositories/github/importer";

const metadata = {
  name: "billing-api", full_name: "acme/billing-api", description: "Example service", private: false, fork: false,
  default_branch: "main", language: "TypeScript", size: 1_024, html_url: "https://github.com/acme/billing-api",
  stargazers_count: 12, updated_at: "2026-07-01T10:00:00Z",
};
const tree = { truncated: false, tree: [
  { path: "package.json", mode: "100644", type: "blob", size: 200 },
  { path: "src/server.ts", mode: "100644", type: "blob", size: 500 },
  { path: "prisma/schema.prisma", mode: "100644", type: "blob", size: 300 },
  { path: "tests/billing.test.ts", mode: "100644", type: "blob", size: 400 },
] };
const packageJson = JSON.stringify({ dependencies: { express: "5", "@prisma/client": "6" }, devDependencies: { typescript: "5", vitest: "3" } });

function json(value: unknown, status = 200) { return Promise.resolve(new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } })); }
function successfulFetcher(input: string | URL | Request) {
  const url = String(input);
  if (url.includes("/git/trees/")) return json(tree);
  if (url.includes("/contents/package.json")) return json({ type: "file", encoding: "base64", content: Buffer.from(packageJson).toString("base64"), size: packageJson.length });
  return json(metadata);
}

describe("GitHub repository import", () => {
  it("accepts only canonical public GitHub repository URLs", () => {
    expect(parseGitHubRepositoryUrl("https://github.com/acme/billing-api.git")).toEqual({ owner: "acme", repository: "billing-api", fullName: "acme/billing-api" });
    expect(() => parseGitHubRepositoryUrl("https://example.com/acme/billing-api")).toThrow(/Only public/);
    expect(() => parseGitHubRepositoryUrl("https://github.com/acme/billing-api/tree/main")).toThrow(/repository root/);
    expect(() => parseGitHubRepositoryUrl("https://user:secret@github.com/acme/billing-api")).toThrow(/Only public/);
  });

  it("maps a supported stack and compatible incident templates", async () => {
    const result = await importPublicGitHubRepository("https://github.com/acme/billing-api", { fetcher: successfulFetcher });
    expect(result.stack).toEqual({ language: "TypeScript", framework: "Express", database: "PostgreSQL", orm: "Prisma", testFramework: "Vitest", packageManager: "unknown" });
    expect(result.compatibleIncidentIds).toEqual(["db-required-field-migration-v1", "container-host-config-v1", "provider-schema-drift-v1"]);
    expect(result.fileCount).toBe(4);
  });

  it("rejects oversized repositories before reading the tree", async () => {
    const fetcher = () => json({ ...metadata, size: 30_000 });
    await expect(importPublicGitHubRepository("https://github.com/acme/billing-api", { fetcher })).rejects.toMatchObject({ code: "REPOSITORY_TOO_LARGE", status: 413 });
  });

  it("accepts a repository when the selected tier raises its import budget", async () => {
    const biggerMetadata = { ...metadata, size: 30_000 };
    const fetcher = (input: string | URL | Request) => String(input).includes("/git/trees/") ? json(tree) : String(input).includes("/contents/package.json") ? json({ type: "file", encoding: "base64", content: Buffer.from(packageJson).toString("base64"), size: packageJson.length }) : json(biggerMetadata);
    const result = await importPublicGitHubRepository("https://github.com/acme/billing-api", { fetcher, limits: { repositoryUploadBytes: 50 * 1024 * 1024, repositoryFiles: 7_500, maxTextFileBytes: 2 * 1024 * 1024 } });
    expect(result.repositorySizeKb).toBe(30_000);
  });

  it("rejects symbolic links and submodules", async () => {
    const fetcher = (input: string | URL | Request) => String(input).includes("/git/trees/") ? json({ truncated: false, tree: [{ path: "escape", mode: "120000", type: "blob", size: 8 }] }) : json(metadata);
    await expect(importPublicGitHubRepository("https://github.com/acme/billing-api", { fetcher })).rejects.toMatchObject({ code: "UNSUPPORTED_LINK" });
  });
});
