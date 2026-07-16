import { z } from "zod";
import { isSafeArchiveEntry } from "../../security/path-validation";
import { extractZipUpload, DEFAULT_UPLOAD_LIMITS } from "../upload/analyzer";
import type { WorkspaceFile } from "../../rehearsals/types";
import type { PlanLimits } from "../../billing/plans";

const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

export const githubImportRequestSchema = z.object({ url: z.string().url().max(300) });

const repositoryResponseSchema = z.object({
  name: z.string(), full_name: z.string(), description: z.string().nullable(), private: z.boolean(), fork: z.boolean(),
  default_branch: z.string(), language: z.string().nullable(), size: z.number().nonnegative(), html_url: z.string().url(),
  stargazers_count: z.number().nonnegative(), updated_at: z.string(),
});
const treeResponseSchema = z.object({
  truncated: z.boolean().default(false),
  tree: z.array(z.object({ path: z.string(), mode: z.string(), type: z.enum(["blob", "tree", "commit"]), size: z.number().optional() })),
});
const contentResponseSchema = z.object({ type: z.literal("file"), encoding: z.literal("base64"), content: z.string(), size: z.number().nonnegative() });

export type GitHubRepositoryRef = { owner: string; repository: string; fullName: string };
export type GitHubImportResult = {
  id: string; name: string; fullName: string; description: string | null; sourceUrl: string; defaultBranch: string;
  stars: number; updatedAt: string; fileCount: number; repositorySizeKb: number;
  stack: { language: "TypeScript" | "JavaScript" | "unknown"; framework: "Express" | "unknown"; database: "PostgreSQL" | "unknown"; orm: "Prisma" | "unknown"; testFramework: "Vitest" | "Jest" | "unknown"; packageManager: "npm" | "pnpm" | "Yarn" | "unknown" };
  compatibleIncidentIds: string[]; detectedFiles: string[]; warnings: string[];
};

export class GitHubImportError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) { super(message); }
}

export function parseGitHubRepositoryUrl(value: string): GitHubRepositoryRef {
  let url: URL;
  try { url = new URL(value); } catch { throw new GitHubImportError("INVALID_URL", "Enter a valid GitHub repository URL."); }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com" || url.username || url.password || url.port) {
    throw new GitHubImportError("UNSUPPORTED_HOST", "Only public https://github.com repository URLs are supported.");
  }
  let segments: string[];
  try { segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent); } catch { throw new GitHubImportError("INVALID_URL", "The repository URL contains invalid characters."); }
  if (segments.length !== 2) throw new GitHubImportError("INVALID_URL", "Use the repository root URL, such as https://github.com/owner/repository.");
  const owner = segments[0];
  const repository = segments[1].replace(/\.git$/i, "");
  if (!OWNER_PATTERN.test(owner) || !REPOSITORY_PATTERN.test(repository) || repository === "." || repository === "..") {
    throw new GitHubImportError("INVALID_URL", "The GitHub owner or repository name is invalid.");
  }
  return { owner, repository, fullName: `${owner}/${repository}` };
}

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

async function githubJson(fetcher: Fetcher, url: string, token?: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetcher(url, { signal: controller.signal, headers: {
      Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "RepoRehearsal/1.0",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } });
    if (response.status === 404) throw new GitHubImportError("NOT_FOUND", "That public repository could not be found.", 404);
    if (response.status === 403 || response.status === 429) throw new GitHubImportError("RATE_LIMITED", "GitHub import is temporarily rate-limited. Try again shortly.", 429);
    if (!response.ok) throw new GitHubImportError("GITHUB_UNAVAILABLE", "GitHub could not be reached for this import.", 502);
    return response.json();
  } catch (error) {
    if (error instanceof GitHubImportError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new GitHubImportError("TIMEOUT", "GitHub did not respond before the import timeout.", 504);
    throw new GitHubImportError("GITHUB_UNAVAILABLE", "GitHub could not be reached for this import.", 502);
  } finally { clearTimeout(timer); }
}

function decodeContent(payload: unknown): string {
  const parsed = contentResponseSchema.parse(payload);
  if (parsed.size > 1_000_000) throw new GitHubImportError("FILE_TOO_LARGE", "A required metadata file exceeds the safe analysis limit.");
  try {
    const compact = parsed.content.replace(/\s/g, "");
    if (typeof atob !== "function") throw new Error("Base64 decoding unavailable");
    return decodeURIComponent(Array.from(atob(compact), char => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""));
  } catch { throw new GitHubImportError("INVALID_CONTENT", "A required repository metadata file could not be decoded."); }
}

export async function importPublicGitHubRepository(value: string, options: { fetcher?: Fetcher; token?: string; limits?: PlanLimits } = {}): Promise<GitHubImportResult> {
  const ref = parseGitHubRepositoryUrl(value);
  const fetcher = options.fetcher ?? fetch;
  const limits = options.limits ?? DEFAULT_UPLOAD_LIMITS;
  const maxRepositoryKb = Math.floor(limits.repositoryUploadBytes / 1024);
  const apiRoot = `https://api.github.com/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repository)}`;
  const repository = repositoryResponseSchema.parse(await githubJson(fetcher, apiRoot, options.token));
  if (repository.private) throw new GitHubImportError("PRIVATE_REPOSITORY", "Private repositories require an authorized GitHub connection.", 403);
  if (repository.size > maxRepositoryKb) throw new GitHubImportError("REPOSITORY_TOO_LARGE", `Repository exceeds the ${Math.round(maxRepositoryKb / 1024)} MB import limit.`, 413);
  const tree = treeResponseSchema.parse(await githubJson(fetcher, `${apiRoot}/git/trees/${encodeURIComponent(repository.default_branch)}?recursive=1`, options.token));
  if (tree.truncated) throw new GitHubImportError("TREE_TRUNCATED", "Repository tree is too large to import safely.", 413);
  const files = tree.tree.filter(entry => entry.type === "blob");
  if (files.length > limits.repositoryFiles) throw new GitHubImportError("TOO_MANY_FILES", `Repository exceeds the ${limits.repositoryFiles.toLocaleString()} file import limit.`, 413);
  if (tree.tree.some(entry => entry.mode === "120000" || entry.type === "commit")) throw new GitHubImportError("UNSUPPORTED_LINK", "Repositories containing symbolic links or submodules are not supported.");
  if (files.some(entry => !isSafeArchiveEntry(entry.path))) throw new GitHubImportError("UNSAFE_PATH", "Repository contains an unsafe file path.");
  const paths = files.map(entry => entry.path);
  let packageJson: Record<string, unknown> = {};
  if (paths.includes("package.json")) {
    const raw = decodeContent(await githubJson(fetcher, `${apiRoot}/contents/package.json?ref=${encodeURIComponent(repository.default_branch)}`, options.token));
    try { packageJson = JSON.parse(raw) as Record<string, unknown>; } catch { throw new GitHubImportError("INVALID_PACKAGE_JSON", "package.json is not valid JSON."); }
  }
  const dependencies = { ...((packageJson.dependencies as Record<string, string> | undefined) ?? {}), ...((packageJson.devDependencies as Record<string, string> | undefined) ?? {}) };
  const hasPrisma = paths.some(path => path.endsWith("schema.prisma")) || "prisma" in dependencies || "@prisma/client" in dependencies;
  const hasTypeScript = paths.some(path => path.endsWith(".ts") || path.endsWith(".tsx")) || "typescript" in dependencies;
  const hasExpress = "express" in dependencies;
  const testFramework = "vitest" in dependencies ? "Vitest" as const : ("jest" in dependencies ? "Jest" as const : "unknown" as const);
  const packageManager = paths.includes("pnpm-lock.yaml") ? "pnpm" as const : paths.includes("yarn.lock") ? "Yarn" as const : paths.includes("package-lock.json") ? "npm" as const : "unknown" as const;
  const compatibleIncidentIds = [...(hasTypeScript && hasExpress && hasPrisma ? ["db-required-field-migration-v1"] : []), ...(hasTypeScript ? ["container-host-config-v1", "provider-schema-drift-v1"] : [])];
  return {
    id: `github-${ref.owner.toLowerCase()}-${ref.repository.toLowerCase()}`, name: repository.name, fullName: repository.full_name,
    description: repository.description, sourceUrl: repository.html_url, defaultBranch: repository.default_branch, stars: repository.stargazers_count,
    updatedAt: repository.updated_at, fileCount: files.length, repositorySizeKb: repository.size,
    stack: { language: hasTypeScript ? "TypeScript" : (repository.language === "JavaScript" ? "JavaScript" : "unknown"), framework: hasExpress ? "Express" : "unknown", database: hasPrisma ? "PostgreSQL" : "unknown", orm: hasPrisma ? "Prisma" : "unknown", testFramework, packageManager },
    compatibleIncidentIds, detectedFiles: paths.filter(path => /(?:package\.json|schema\.prisma|docker-compose|Dockerfile|\.test\.[jt]sx?$|migration\.sql$)/.test(path)).slice(0, 20),
    warnings: repository.fork ? ["This repository is a fork; analysis uses its current default branch."] : [],
  };
}

export async function downloadPublicGitHubSource(value: string, branch: string, options: { fetcher?: Fetcher; limits?: PlanLimits } = {}): Promise<WorkspaceFile[]> {
  const ref = parseGitHubRepositoryUrl(value); const fetcher = options.fetcher ?? fetch;
  const limits = options.limits ?? DEFAULT_UPLOAD_LIMITS;
  const limitLabel = `${Math.round(limits.repositoryUploadBytes / 1024 / 1024)} MB`;
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetcher(`https://codeload.github.com/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repository)}/zip/${encodeURIComponent(branch)}`, { signal: controller.signal, headers: { "User-Agent": "RepoRehearsal/1.0" } });
    if (!response.ok) throw new GitHubImportError("SOURCE_UNAVAILABLE", "GitHub source could not be downloaded for the rehearsal.", 502);
    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (declaredSize > limits.repositoryUploadBytes) throw new GitHubImportError("REPOSITORY_TOO_LARGE", `Repository source exceeds the ${limitLabel} import limit.`, 413);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > limits.repositoryUploadBytes) throw new GitHubImportError("REPOSITORY_TOO_LARGE", `Repository source exceeds the ${limitLabel} import limit.`, 413);
    const extracted = extractZipUpload(bytes, limits); const decoder = new TextDecoder("utf-8", { fatal: true }); const files: WorkspaceFile[] = [];
    for (const file of extracted.files) { try { files.push({ path: file.path, content: decoder.decode(file.bytes) }); } catch { /* Invalid text files are excluded. */ } }
    if (!files.length) throw new GitHubImportError("NO_ANALYZABLE_FILES", "No supported source files were found in the repository.");
    return files;
  } catch (error) {
    if (error instanceof GitHubImportError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new GitHubImportError("TIMEOUT", "GitHub source download timed out.", 504);
    throw new GitHubImportError("SOURCE_UNAVAILABLE", "GitHub source could not be downloaded for the rehearsal.", 502);
  } finally { clearTimeout(timer); }
}
