import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../auth";
import { saveAccountRepository } from "../../../../src/accounts/account-service";
import { analyzeUploadedFiles, extractZipUpload, RepositoryUploadError, validateFolderUpload, type UploadedFile } from "../../../../src/repositories/upload/analyzer";
import { formatBytes, planFromRequest } from "../../../../src/billing/plans";
import { saveRepository } from "../../../../src/repositories/repository-service";
import { consumeRateLimit, RateLimitError } from "../../../../src/security/rate-limit";

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    await consumeRateLimit(request, "repository-upload", 10, 3_600);
    const plan = planFromRequest(request);
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > plan.limits.repositoryUploadBytes + 1_000_000) throw new RepositoryUploadError("UPLOAD_TOO_LARGE", `The upload exceeds the ${formatBytes(plan.limits.repositoryUploadBytes)} ${plan.name} limit.`, 413);
    const form = await request.formData();
    const archive = form.get("archive");
    const rawFiles = form.getAll("files").filter((value): value is File => value instanceof File);
    const rawPaths = form.get("paths");
    const nameValue = form.get("name");
    const name = typeof nameValue === "string" ? nameValue : archive instanceof File ? archive.name.replace(/\.zip$/i, "") : "Uploaded codebase";
    let files: UploadedFile[];
    let sourceFileCount: number;
    if (archive instanceof File) {
      if (!/\.zip$/i.test(archive.name)) throw new RepositoryUploadError("INVALID_FILE_TYPE", "Choose a .zip archive or a source folder.");
      const extracted = extractZipUpload(new Uint8Array(await archive.arrayBuffer()), plan.limits);
      files = extracted.files;
      sourceFileCount = extracted.fileCount;
    } else {
      let paths: unknown;
      try { paths = typeof rawPaths === "string" ? JSON.parse(rawPaths) : []; } catch { throw new RepositoryUploadError("INVALID_MANIFEST", "The folder file list is invalid."); }
      if (!Array.isArray(paths) || paths.length !== rawFiles.length || paths.some(path => typeof path !== "string")) throw new RepositoryUploadError("INVALID_MANIFEST", "The folder file list is invalid.");
      sourceFileCount = rawFiles.length;
      files = validateFolderUpload(await Promise.all(rawFiles.map(async (file, index) => ({ path: paths[index] as string, bytes: new Uint8Array(await file.arrayBuffer()) }))), plan.limits);
    }
    const repository = analyzeUploadedFiles(name, files, sourceFileCount);
    const user = await getAuthenticatedUser();
    const decoder = new TextDecoder("utf-8", { fatal: true }); const workspaceFiles: { path: string; content: string }[] = [];
    for (const file of files) { try { workspaceFiles.push({ path: file.path, content: decoder.decode(file.bytes) }); } catch { /* Invalid text files remain excluded. */ } }
    const stored = await saveRepository(user ? { email: user.email, displayName: user.displayName } : null, { id: repository.id, source: "UPLOAD", externalRef: null, name: repository.name, analysis: repository as unknown as Record<string, unknown>, files: workspaceFiles });
    if (user) await saveAccountRepository(user.email, user.displayName, { id: repository.id, source: "UPLOAD", externalId: null, name: repository.name, displayRef: `${repository.fileCount} local files`, ...repository.stack, fileCount: repository.fileCount });
    return NextResponse.json({ repository, accessToken: stored.accessToken, savedToAccount: Boolean(user), sourceModified: false, correlationId });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: { code: "RATE_LIMITED", message: error.message, correlationId } }, { status: 429, headers: { "Retry-After": String(error.retryAfter) } });
    if (error instanceof RepositoryUploadError) return NextResponse.json({ error: { code: error.code, message: error.message, correlationId } }, { status: error.status });
    console.error("Repository upload failed", { correlationId, error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: { code: "UPLOAD_FAILED", message: "The codebase could not be analyzed safely.", correlationId } }, { status: 500 });
  }
}
