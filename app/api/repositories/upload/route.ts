import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { saveAccountRepository } from "../../../../src/accounts/account-service";
import { analyzeUploadedFiles, extractZipUpload, MAX_UPLOAD_BYTES, RepositoryUploadError, validateFolderUpload, type UploadedFile } from "../../../../src/repositories/upload/analyzer";

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_UPLOAD_BYTES + 1_000_000) throw new RepositoryUploadError("UPLOAD_TOO_LARGE", "The upload exceeds the 20 MB limit.", 413);
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
      const extracted = extractZipUpload(new Uint8Array(await archive.arrayBuffer()));
      files = extracted.files;
      sourceFileCount = extracted.fileCount;
    } else {
      let paths: unknown;
      try { paths = typeof rawPaths === "string" ? JSON.parse(rawPaths) : []; } catch { throw new RepositoryUploadError("INVALID_MANIFEST", "The folder file list is invalid."); }
      if (!Array.isArray(paths) || paths.length !== rawFiles.length || paths.some(path => typeof path !== "string")) throw new RepositoryUploadError("INVALID_MANIFEST", "The folder file list is invalid.");
      sourceFileCount = rawFiles.length;
      files = validateFolderUpload(await Promise.all(rawFiles.map(async (file, index) => ({ path: paths[index] as string, bytes: new Uint8Array(await file.arrayBuffer()) }))));
    }
    const repository = analyzeUploadedFiles(name, files, sourceFileCount);
    const user = await getChatGPTUser();
    if (user) await saveAccountRepository(user.email, user.displayName, { id: repository.id, source: "UPLOAD", externalId: null, name: repository.name, displayRef: `${repository.fileCount} local files`, ...repository.stack, fileCount: repository.fileCount });
    return NextResponse.json({ repository, savedToAccount: Boolean(user), sourceModified: false, correlationId });
  } catch (error) {
    if (error instanceof RepositoryUploadError) return NextResponse.json({ error: { code: error.code, message: error.message, correlationId } }, { status: error.status });
    console.error("Repository upload failed", { correlationId, error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: { code: "UPLOAD_FAILED", message: "The codebase could not be analyzed safely.", correlationId } }, { status: 500 });
  }
}
