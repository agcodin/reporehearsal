import { NextResponse } from "next/server";
import { githubImportRequestSchema, GitHubImportError, importPublicGitHubRepository, downloadPublicGitHubSource } from "../../../../src/repositories/github/importer";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { saveAccountRepository } from "../../../../src/accounts/account-service";
import { saveRepository } from "../../../../src/repositories/repository-service";
import { consumeRateLimit, RateLimitError } from "../../../../src/security/rate-limit";
import { analyzeRepository } from "../../../../src/repositories/analyzer";
import { GENERATED_INCIDENT_ID } from "../../../../src/incidents/brain";

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    await consumeRateLimit(request, "github-import", 10, 3_600);
    const body = githubImportRequestSchema.safeParse(await request.json());
    if (!body.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Enter a valid GitHub repository URL.", correlationId } }, { status: 400 });
    const repository = await importPublicGitHubRepository(body.data.url, { token: process.env.GITHUB_TOKEN });
    const user = await getChatGPTUser();
    const files = await downloadPublicGitHubSource(body.data.url, repository.defaultBranch);
    const analysis = analyzeRepository(repository.id, repository.name, files);
    const stack = { language: analysis.language, framework: analysis.framework, database: analysis.database, orm: analysis.orm, testFramework: analysis.testFramework, packageManager: analysis.packageManager };
    const compatibleIncidentIds = analysis.incidentCandidates.length ? [GENERATED_INCIDENT_ID] : [];
    const detectedFiles = [...analysis.entryPoints, ...analysis.migrations, ...analysis.testFiles].slice(0, 20);
    const stored = await saveRepository(user ? { email: user.email, displayName: user.displayName } : null, { source: "GITHUB_PUBLIC", externalRef: repository.id, name: repository.name, analysis: { ...analysis, sourceUrl: repository.sourceUrl, fullName: repository.fullName } as unknown as Record<string, unknown>, files });
    if (user) await saveAccountRepository(user.email, user.displayName, { id: stored.repository.id, source: "GITHUB_PUBLIC", externalId: repository.id, name: repository.name, displayRef: repository.fullName, ...stack, fileCount: repository.fileCount });
    return NextResponse.json({ repository: { ...repository, id: stored.repository.id, stack, compatibleIncidentIds, detectedFiles, warnings: [...repository.warnings, ...(compatibleIncidentIds.length ? [] : ["No safe, repairable source boundary was found for automatic incident generation."])] }, accessToken: stored.accessToken, savedToAccount: Boolean(user), sourceModified: false, correlationId });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: { code: "RATE_LIMITED", message: error.message, correlationId } }, { status: 429, headers: { "Retry-After": String(error.retryAfter) } });
    if (error instanceof GitHubImportError) return NextResponse.json({ error: { code: error.code, message: error.message, correlationId } }, { status: error.status });
    console.error("GitHub import failed", { correlationId, error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: { code: "IMPORT_FAILED", message: "The repository could not be analyzed safely.", correlationId } }, { status: 500 });
  }
}
