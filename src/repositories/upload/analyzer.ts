import { unzipSync } from "fflate";
import { analyzeRepository, type AnalyzableFile } from "../analyzer";
import { isSafeArchiveEntry } from "../../security/path-validation";
import { GENERATED_INCIDENT_ID } from "../../incidents/brain";
import { planFor, type PlanLimits } from "../../billing/plans";

export const DEFAULT_UPLOAD_LIMITS = planFor("FREE").limits;
export const MAX_UPLOAD_BYTES = DEFAULT_UPLOAD_LIMITS.repositoryUploadBytes;
export const MAX_UPLOAD_FILES = DEFAULT_UPLOAD_LIMITS.repositoryFiles;
const excludedDirectories = new Set([".git", ".next", "node_modules", "dist", "build", "coverage", ".turbo"]);
const allowedExtensions = new Set([".c", ".cc", ".cjs", ".cpp", ".cs", ".css", ".cxx", ".env.example", ".go", ".graphql", ".h", ".hpp", ".html", ".java", ".js", ".json", ".jsx", ".kt", ".kts", ".md", ".mjs", ".php", ".prisma", ".properties", ".py", ".rb", ".rs", ".scala", ".sh", ".sql", ".swift", ".toml", ".ts", ".tsx", ".txt", ".xml", ".yaml", ".yml"]);

export type UploadedFile = { path: string; bytes: Uint8Array };
export type UploadAnalysis = {
  id: string;
  name: string;
  fileCount: number;
  analyzedFileCount: number;
  totalBytes: number;
  stack: { language: string; framework: string; database: string; orm: string; testFramework: string; packageManager: string };
  detectedFiles: string[];
  compatibleIncidentIds: string[];
  warnings: string[];
};

export class RepositoryUploadError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) { super(message); }
}

function safePath(raw: string): string {
  const path = raw.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!isSafeArchiveEntry(path)) throw new RepositoryUploadError("UNSAFE_PATH", "The upload contains an unsafe file path.");
  return path;
}

function isSensitivePath(path: string): boolean {
  const parts = path.toLowerCase().split("/");
  const filename = parts.at(-1) ?? "";
  if (parts.some(part => excludedDirectories.has(part))) return true;
  return filename === ".env" || filename.startsWith(".env.") && filename !== ".env.example" || filename === ".npmrc" || filename === "credentials.json" || filename.startsWith("id_rsa") || /\.(?:key|pem|p12|pfx)$/.test(filename);
}

function isTextCandidate(path: string): boolean {
  const filename = path.toLowerCase().split("/").at(-1) ?? "";
  if (["dockerfile", "makefile", "procfile", "gemfile", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", ".env.example"].includes(filename)) return true;
  const dot = filename.lastIndexOf(".");
  return dot >= 0 && allowedExtensions.has(filename.slice(dot));
}

function normalizeRoot(files: UploadedFile[]): UploadedFile[] {
  const firstSegments = files.map(file => file.path.split("/")[0]);
  const root = firstSegments[0];
  if (!root || !firstSegments.every(segment => segment === root) || files.some(file => !file.path.includes("/"))) return files;
  return files.map(file => ({ ...file, path: file.path.slice(root.length + 1) })).filter(file => file.path);
}

function limitMessage(limits: PlanLimits) { return limits.repositoryUploadBytes === null ? "configured platform capacity" : `${Math.round(limits.repositoryUploadBytes / 1024 / 1024)} MB`; }

export function extractZipUpload(bytes: Uint8Array, limits: PlanLimits = DEFAULT_UPLOAD_LIMITS): { files: UploadedFile[]; fileCount: number } {
  if (!bytes.length || limits.repositoryUploadBytes !== null && bytes.length > limits.repositoryUploadBytes) throw new RepositoryUploadError("UPLOAD_TOO_LARGE", `ZIP uploads must be ${limitMessage(limits)} or smaller.`, 413);
  let fileCount = 0;
  let totalBytes = 0;
  try {
    const extracted = unzipSync(bytes, { filter(info) {
      const path = safePath(info.name);
      if (info.name.endsWith("/")) return false;
      fileCount += 1;
      totalBytes += info.originalSize;
      if (fileCount > limits.repositoryFiles) throw new RepositoryUploadError("TOO_MANY_FILES", `The codebase contains more than ${limits.repositoryFiles.toLocaleString()} files.`, 413);
      if (limits.repositoryUploadBytes !== null && totalBytes > limits.repositoryUploadBytes) throw new RepositoryUploadError("EXPANDED_UPLOAD_TOO_LARGE", `The expanded codebase exceeds the ${limitMessage(limits)} analysis limit.`, 413);
      return info.originalSize <= limits.maxTextFileBytes && !isSensitivePath(path) && isTextCandidate(path);
    } });
    return { files: normalizeRoot(Object.entries(extracted).map(([path, file]) => ({ path: safePath(path), bytes: file }))), fileCount };
  } catch (error) {
    if (error instanceof RepositoryUploadError) throw error;
    throw new RepositoryUploadError("INVALID_ZIP", "The selected ZIP could not be read safely.");
  }
}

export function validateFolderUpload(files: UploadedFile[], limits: PlanLimits = DEFAULT_UPLOAD_LIMITS): UploadedFile[] {
  if (!files.length) throw new RepositoryUploadError("EMPTY_UPLOAD", "Choose a folder containing source files.");
  if (files.length > limits.repositoryFiles) throw new RepositoryUploadError("TOO_MANY_FILES", `The codebase contains more than ${limits.repositoryFiles.toLocaleString()} files.`, 413);
  let totalBytes = 0;
  const selected: UploadedFile[] = [];
  for (const file of files) {
    const path = safePath(file.path);
    totalBytes += file.bytes.byteLength;
    if (limits.repositoryUploadBytes !== null && totalBytes > limits.repositoryUploadBytes) throw new RepositoryUploadError("UPLOAD_TOO_LARGE", `The codebase exceeds the ${limitMessage(limits)} analysis limit.`, 413);
    if (file.bytes.byteLength <= limits.maxTextFileBytes && !isSensitivePath(path) && isTextCandidate(path)) selected.push({ path, bytes: file.bytes });
  }
  return normalizeRoot(selected);
}

export function analyzeUploadedFiles(name: string, allFiles: UploadedFile[], sourceFileCount = allFiles.length): UploadAnalysis {
  if (!allFiles.length) throw new RepositoryUploadError("NO_ANALYZABLE_FILES", "No supported source or configuration files were found.");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const analyzable: AnalyzableFile[] = [];
  let totalBytes = 0;
  for (const file of allFiles) {
    try { analyzable.push({ path: file.path, content: decoder.decode(file.bytes) }); totalBytes += file.bytes.byteLength; } catch { /* Binary or invalid UTF-8 files are excluded from analysis. */ }
  }
  if (!analyzable.length) throw new RepositoryUploadError("NO_ANALYZABLE_FILES", "No readable source or configuration files were found.");
  const safeName = name.trim().slice(0, 100) || "Uploaded codebase";
  const id = `upload-${crypto.randomUUID()}`;
  const map = analyzeRepository(id, safeName, analyzable);
  const paths = analyzable.map(file => file.path);
  const packageJson = analyzable.find(file => file.path === "package.json")?.content ?? "";
  const language = map.language;
  const framework = map.framework;
  const testFramework = map.testFramework;
  const database = map.database ?? "unknown";
  const orm = map.orm ?? "unknown";
  const packageManager = paths.includes("pnpm-lock.yaml") ? "pnpm" : paths.includes("yarn.lock") ? "Yarn" : paths.includes("package-lock.json") ? "npm" : "unknown";
  const compatibleIncidentIds = map.incidentCandidates.length ? [GENERATED_INCIDENT_ID] : [];
  return {
    id, name: safeName, fileCount: sourceFileCount, analyzedFileCount: analyzable.length, totalBytes,
    stack: { language, framework, database, orm, testFramework, packageManager },
    detectedFiles: paths.filter(path => /(?:package\.json|schema\.prisma|docker-compose|Dockerfile|\.test\.[jt]sx?$|migration\.sql$)/.test(path)).slice(0, 20),
    compatibleIncidentIds,
    warnings: sourceFileCount > analyzable.length ? [`${sourceFileCount - analyzable.length} generated, binary, oversized, or sensitive files were excluded.`] : [],
  };
}
