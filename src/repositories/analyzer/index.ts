import { incidentCandidatePreviews } from "../../incidents/brain";
import type { RepositoryMap } from "../../types";

export type AnalyzableFile = { path: string; content: string };

function packageMetadata(content: string) {
  try { return JSON.parse(content) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; scripts?: Record<string, string>; workspaces?: unknown }; }
  catch { return {}; }
}

function names(source: string, expression: RegExp): string[] {
  return [...source.matchAll(expression)].map(match => match[1]).filter(Boolean);
}

export function analyzeRepository(repositoryId: string, name: string, files: AnalyzableFile[]): RepositoryMap {
  const ordered = [...files].sort((left, right) => left.path.localeCompare(right.path));
  const paths = ordered.map(file => file.path);
  const packageFile = ordered.find(file => file.path === "package.json");
  const pkg = packageMetadata(packageFile?.content ?? "");
  const packages = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const prismaFiles = ordered.filter(file => file.path.endsWith("schema.prisma"));
  const prisma = prismaFiles.map(file => file.content).join("\n");
  const sourceFiles = ordered.filter(file => /\.(?:js|jsx|ts|tsx)$/.test(file.path));
  const language = paths.some(path => /\.tsx?$/.test(path)) ? "TypeScript" : paths.some(path => /\.jsx?$/.test(path)) ? "JavaScript" : paths.some(path => path.endsWith(".py")) ? "Python" : "unknown";
  const framework = packages.express ? "Express" : packages.next ? "Next.js" : packages.fastify ? "Fastify" : packages.koa ? "Koa" : packages["@nestjs/core"] ? "NestJS" : "unknown";
  const packageManager = paths.includes("pnpm-lock.yaml") ? "pnpm" : paths.includes("yarn.lock") ? "Yarn" : paths.includes("package-lock.json") ? "npm" : "unknown";
  const database = /provider\s*=\s*["']postgresql["']/.test(prisma) || /postgres(?:ql)?:\/\//i.test(ordered.map(file => file.content).join("\n")) ? "PostgreSQL" : /provider\s*=\s*["']mysql["']/.test(prisma) ? "MySQL" : "unknown";
  const orm = prisma ? "Prisma" : packages.typeorm ? "TypeORM" : packages.sequelize ? "Sequelize" : packages["drizzle-orm"] ? "Drizzle" : "unknown";
  const testFramework = packages.vitest ? "Vitest" : packages.jest ? "Jest" : packages.mocha ? "Mocha" : "unknown";
  const entryPoints = paths.filter(path => /(?:^|\/)(?:server|index|main|app)\.(?:js|jsx|ts|tsx)$/.test(path)).slice(0, 20);
  const routes = sourceFiles.flatMap(file => [...file.content.matchAll(/\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi)].map(match => `${match[1].toUpperCase()} ${match[2]}`)).slice(0, 40);
  const serviceGroups = new Map<string, string[]>();
  for (const file of sourceFiles) {
    const segment = file.path.split("/").find(part => /^(?:services?|apps?|packages?|api|server|web|worker)$/i.test(part));
    const key = segment ? `${segment.toLowerCase()} service` : framework !== "unknown" ? `${framework} application` : "application";
    serviceGroups.set(key, [...(serviceGroups.get(key) ?? []), file.path]);
  }
  const services = [...serviceGroups.entries()].slice(0, 8).map(([serviceName, serviceFiles], index) => ({ name: serviceName, files: serviceFiles.slice(0, 30), routes: index === 0 ? routes : [] }));
  const databaseModels = [...prisma.matchAll(/model\s+([A-Za-z_$][\w$]*)\s*\{([\s\S]*?)\}/g)].map(match => ({ name: match[1], fields: names(match[2], /^\s*([A-Za-z_$][\w$]*)\s+[A-Za-z_$]/gm) })).slice(0, 30);
  const environmentVariables = [...new Set(sourceFiles.flatMap(file => names(file.content, /process\.env\.([A-Z][A-Z0-9_]*)/g)).concat(ordered.filter(file => /\.env\.example$/.test(file.path)).flatMap(file => names(file.content, /^([A-Z][A-Z0-9_]*)=/gm))))].sort().map(variable => ({ name: variable, required: !sourceFiles.some(file => new RegExp(`process\\.env\\.${variable}\\s*(?:\\?\\?|\\|\\|)`).test(file.content)), secret: /SECRET|TOKEN|KEY|PASSWORD|DATABASE_URL/.test(variable) }));
  const healthChecks = [...new Set(routes.filter(route => /\/(?:health|ready|live|status)\b/i.test(route)))];
  const incidentCandidates = incidentCandidatePreviews(ordered);
  const riskAreas = incidentCandidates.slice(0, 8).map(candidate => ({ type: candidate.category, description: candidate.reason, relatedFiles: [candidate.targetPath], confidence: candidate.confidence }));

  return {
    analysisVersion: 2, repositoryId, name, language, framework, packageManager, database, orm, testFramework,
    containerized: paths.some(path => /(?:^|\/)(?:Dockerfile|docker-compose.*\.ya?ml|compose.*\.ya?ml)$/.test(path)),
    entryPoints, services, databaseModels,
    migrations: paths.filter(path => /(?:^|\/)(?:prisma\/)?migrations?\//.test(path) || /migration.*\.sql$/i.test(path)).slice(0, 50),
    environmentVariables,
    testFiles: paths.filter(path => /(?:^|\/)(?:test|tests|__tests__)(?:\/|$)|\.(?:spec|test)\.[jt]sx?$/.test(path)).slice(0, 100),
    healthChecks, riskAreas, incidentCandidates,
  };
}
