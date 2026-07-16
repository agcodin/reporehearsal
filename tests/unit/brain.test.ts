import { describe, expect, it } from "vitest";
import { applyGeneratedIncident, discoverIncidentCandidates, evaluateGeneratedIncident, generateIncidentBlueprint } from "../../src/incidents/brain";
import { analyzeRepository } from "../../src/repositories/analyzer";
import type { TimelineEvent, WorkspaceFile } from "../../src/rehearsals/types";

const repository: WorkspaceFile[] = [
  { path: "package.json", content: JSON.stringify({ scripts: { test: "vitest run", build: "tsc" }, dependencies: { express: "5" }, devDependencies: { vitest: "3" } }, null, 2) },
  { path: "docker-compose.yml", content: "services:\n  api:\n    environment:\n      DATABASE_URL: postgresql://app:app@postgres:5432/app\n  postgres:\n    image: postgres:16" },
  { path: "src/profile.ts", content: "export function region(profile: { region?: string }) {\n  return (profile.region ?? \"US\").toUpperCase();\n}" },
  { path: "src/server.ts", content: "import express from 'express';\nconst app = express();\napp.get('/health', (_req, res) => res.json({ ok: true }));" },
  { path: "tests/profile.test.ts", content: "it('normalizes a region', () => {});" },
  { path: "prisma/schema.prisma", content: "datasource db { provider = \"postgresql\" }\nmodel Profile { id String @id region String? }" },
];

function event(type: string, extra: Partial<TimelineEvent> = {}): TimelineEvent { return { type, timestamp: new Date().toISOString(), summary: type, ...extra }; }

describe("repository incident brain", () => {
  it("maps architecture and ranks real mutation candidates", () => {
    const map = analyzeRepository("repo-1", "Profile service", repository);
    expect(map).toMatchObject({ analysisVersion: 2, language: "TypeScript", framework: "Express", database: "PostgreSQL", orm: "Prisma", testFramework: "Vitest", containerized: true });
    expect(map.healthChecks).toContain("GET /health");
    expect(map.databaseModels[0]).toMatchObject({ name: "Profile" });
    expect(map.incidentCandidates[0]).toMatchObject({ name: "Container service discovery regression", targetPath: "docker-compose.yml" });
  });

  it("injects only the session copy and rejects the unresolved incident", () => {
    const blueprint = generateIncidentBlueprint(repository, "INTERMEDIATE");
    const injected = applyGeneratedIncident(repository, blueprint);
    expect(repository.find(file => file.path === blueprint.targetPath)?.content).toContain("@postgres:5432");
    expect(injected.find(file => file.path === blueprint.targetPath)?.content).toContain("@localhost:5432");
    const validation = evaluateGeneratedIncident(blueprint, injected, { timeline: [], hypotheses: [], hintCount: 0 });
    expect(validation.passed).toBe(false);
    expect(validation.checks[0].status).toBe("failed");
  });

  it("passes a restored behavior contract and scores the investigation trail", () => {
    const blueprint = generateIncidentBlueprint(repository, "INTERMEDIATE");
    const injected = applyGeneratedIncident(repository, blueprint);
    const repaired = injected.map(file => file.path === blueprint.targetPath ? { ...file, content: blueprint.baselineTarget } : file);
    const timeline = [event("evidence_viewed", { commandId: "evidence-logs" }), event("evidence_viewed", { commandId: "evidence-database" }), event("file_opened", { path: blueprint.targetPath }), event("file_edited", { path: blueprint.targetPath }), event("command_run", { commandId: "run-tests" }), event("command_run", { commandId: "run-build" }), event("command_run", { commandId: "restart-service" }), event("command_run", { commandId: "check-health" })];
    const validation = evaluateGeneratedIncident(blueprint, repaired, { timeline, hypotheses: ["The evidence shows localhost resolves inside the application container, so the service hostname must be restored."], hintCount: 0 });
    expect(validation.passed).toBe(true);
    expect(validation.score).toBeGreaterThanOrEqual(85);
    expect(validation.score).toBe(validation.breakdown.reduce((sum, item) => sum + item.earned, 0));
  });

  it("falls back to a real package quality command when no stronger boundary exists", () => {
    const files = [{ path: "package.json", content: JSON.stringify({ scripts: { test: "vitest run" } }, null, 2) }];
    expect(discoverIncidentCandidates(files)[0]).toMatchObject({ kind: "package-script", targetPath: "package.json" });
  });
});
