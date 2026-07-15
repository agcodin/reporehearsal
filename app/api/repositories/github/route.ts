import { NextResponse } from "next/server";
import { githubImportRequestSchema, GitHubImportError, importPublicGitHubRepository } from "../../../../src/repositories/github/importer";

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const body = githubImportRequestSchema.safeParse(await request.json());
    if (!body.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Enter a valid GitHub repository URL.", correlationId } }, { status: 400 });
    const repository = await importPublicGitHubRepository(body.data.url, { token: process.env.GITHUB_TOKEN });
    return NextResponse.json({ repository, sourceModified: false, correlationId });
  } catch (error) {
    if (error instanceof GitHubImportError) return NextResponse.json({ error: { code: error.code, message: error.message, correlationId } }, { status: error.status });
    console.error("GitHub import failed", { correlationId, error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: { code: "IMPORT_FAILED", message: "The repository could not be analyzed safely.", correlationId } }, { status: 500 });
  }
}
