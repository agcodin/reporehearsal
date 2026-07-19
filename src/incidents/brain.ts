import { hintPenalty } from "../evaluation/scoring";
import type { IncidentCategory, IncidentTemplate, ValidationResult } from "../types";
import type { TimelineEvent, WorkspaceFile } from "../rehearsals/types";

export const GENERATED_INCIDENT_ID = "repository-generated-v1";

export type MutationKind = "container-host" | "nullable-value" | "response-guard" | "environment-fallback" | "language-fallback" | "package-script";

export type IncidentCandidate = {
  id: string;
  kind: MutationKind;
  name: string;
  category: IncidentCategory;
  targetPath: string;
  confidence: number;
  reason: string;
  before: string;
  after: string;
  subject?: string;
  method?: string;
  environmentName?: string;
  scriptName?: string;
  baselineValue?: string;
  language?: string;
};

export type IncidentCandidatePreview = Pick<IncidentCandidate, "id" | "name" | "category" | "targetPath" | "confidence" | "reason">;

export type GeneratedIncidentBlueprint = {
  version: 1;
  generator: "repository-brain-v1" | "team-studio-v1";
  candidate: IncidentCandidate;
  template: IncidentTemplate;
  targetPath: string;
  baselineTarget: string;
  baselineHashes: Record<string, string>;
  testPaths: string[];
  logs: string[];
  databaseEvidence: string[];
  healthEvidence: string[];
};

export function preventionForGeneratedIncident(blueprint: GeneratedIncidentBlueprint): string[] {
  const { candidate } = blueprint;
  if (blueprint.generator === "team-studio-v1") return [`Keep regression coverage for the manager-approved behavior in ${candidate.targetPath}.`, "Review this incident contract after related production changes so the evidence and validation remain current."];
  if (candidate.kind === "container-host") return ["Validate service hostnames from inside the deployment network, not only from a developer machine.", "Keep an integration check that boots the application beside its declared container dependencies."];
  if (candidate.kind === "nullable-value" || candidate.kind === "language-fallback") return [`Keep a regression test for the missing-value path handled in ${candidate.targetPath}.`, `Document and enforce the expected default for ${candidate.subject ?? "optional input"} at the normalization boundary.`];
  if (candidate.kind === "response-guard") return ["Validate upstream status before parsing a success payload.", "Add contract fixtures for error, partial, and renamed provider responses."];
  if (candidate.kind === "environment-fallback") return [`Validate ${candidate.environmentName ?? "runtime configuration"} during startup and document whether it is required.`, "Exercise both present and absent environment-value paths in deployment tests."];
  return [`Run the repository-owned ${candidate.scriptName ?? "quality"} command in CI before release.`, "Keep package scripts aligned with installed tooling and verify them after dependency changes."];
}

type EvaluationContext = { timeline: TimelineEvent[]; hypotheses: string[]; hintCount: number };

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function sourceFile(file: WorkspaceFile) { return /\.(?:c|cc|cjs|cpp|cs|cxx|go|h|hpp|java|js|jsx|kt|kts|mjs|php|py|rb|rs|scala|swift|ts|tsx)$/.test(file.path) && file.content.length <= 500_000; }
function candidateId(kind: MutationKind, path: string) { return `${kind}-${stableHash(path)}`; }

export function discoverIncidentCandidates(files: WorkspaceFile[]): IncidentCandidate[] {
  const candidates: IncidentCandidate[] = [];
  const ordered = [...files].sort((left, right) => left.path.localeCompare(right.path));
  const hasPrisma = ordered.some(file => file.path.endsWith("schema.prisma"));

  for (const file of ordered) {
    if (!/(?:\.env\.example|compose.*\.ya?ml|docker-compose.*\.ya?ml)$/i.test(file.path)) continue;
    const match = file.content.match(/(postgres(?:ql)?:\/\/[^\s"'`@]+@)(postgres|db|database|postgresql)(?=[:/])/i);
    if (!match) continue;
    candidates.push({ id: candidateId("container-host", file.path), kind: "container-host", name: "Container service discovery regression", category: "configuration", targetPath: file.path, confidence: 0.97, reason: "A container-scoped database URL uses a service hostname that can be safely changed in the isolated copy.", before: match[0], after: `${match[1]}localhost`, baselineValue: match[2] });
  }

  for (const file of ordered.filter(sourceFile)) {
    const fallback = file.content.match(/\(([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+)\s*\?\?\s*(["'`][^"'`\n]{1,60}["'`])\)\.(trim|toUpperCase|toLowerCase)\(\)/);
    if (fallback) {
      const category: IncidentCategory = hasPrisma ? "database" : "external_dependency";
      candidates.push({ id: candidateId("nullable-value", file.path), kind: "nullable-value", name: hasPrisma ? "Nullable record serialization failure" : "Missing value normalization failure", category, targetPath: file.path, confidence: hasPrisma ? 0.95 : 0.9, reason: `A real null-safe normalization boundary was found in ${file.path}.`, before: fallback[0], after: `${fallback[1]}.${fallback[3]}()`, subject: fallback[1], method: fallback[3] });
      continue;
    }
    const optional = file.content.match(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+)\?\.(trim|toUpperCase|toLowerCase)\(\)/);
    if (optional) candidates.push({ id: candidateId("nullable-value", file.path), kind: "nullable-value", name: "Optional value dereference", category: hasPrisma ? "database" : "external_dependency", targetPath: file.path, confidence: hasPrisma ? 0.92 : 0.87, reason: `An optional value is normalized safely in ${file.path}; the isolated incident removes that guard.`, before: optional[0], after: `${optional[1]}.${optional[2]}()`, subject: optional[1], method: optional[2] });
  }

  for (const file of ordered.filter(sourceFile)) {
    if (file.path.endsWith(".py")) { const match=file.content.match(/^\s*([a-zA-Z_]\w*)\s*=\s*([^\n]+?)\s+or\s+(["'][^"'\n]{1,60}["'])/m); if(match)candidates.push({id:candidateId("language-fallback",file.path),kind:"language-fallback",name:"Python missing-value fallback regression",category:"configuration",targetPath:file.path,confidence:.91,reason:`A Python fallback protecting ${match[1]} was found in ${file.path}.`,before:match[0],after:`${match[1]} = ${match[2]}`,subject:match[1],baselineValue:match[3],language:"Python"}); }
    else if (/\.(?:cs|kt|kts|scala|swift)$/.test(file.path)) { const match=file.content.match(/([A-Za-z_]\w*)\s*=\s*([^;\n]+?)\s*(\?\?|\?:)\s*([^;\n]+)/); if(match){const language=file.path.endsWith(".cs")?"C#":/\.kts?$/.test(file.path)?"Kotlin":file.path.endsWith(".swift")?"Swift":"Scala";candidates.push({id:candidateId("language-fallback",file.path),kind:"language-fallback",name:`${language} null fallback regression`,category:"external_dependency",targetPath:file.path,confidence:.88,reason:`A ${language} null fallback was found in ${file.path}.`,before:match[0],after:`${match[1]} = ${match[2]}`,subject:match[1],baselineValue:match[4],language});} }
    else if (file.path.endsWith(".java")) { const match=file.content.match(/Objects\.requireNonNullElse\(([^,\n]+),\s*([^\n)]+)\)/); if(match)candidates.push({id:candidateId("language-fallback",file.path),kind:"language-fallback",name:"Java null contract regression",category:"external_dependency",targetPath:file.path,confidence:.9,reason:`A Java null-default contract was found in ${file.path}.`,before:match[0],after:match[1].trim(),subject:match[1].trim(),baselineValue:match[2].trim(),language:"Java"}); }
    else if (/\.(?:c|cc|cpp|cxx|h|hpp)$/.test(file.path)) { const match=file.content.match(/if\s*\(\s*!([A-Za-z_]\w*)\s*\)\s*(?:\{\s*)?return\s+[^;]+;\s*\}?/); if(match)candidates.push({id:candidateId("language-fallback",file.path),kind:"language-fallback",name:`${/\.(?:c|h)$/.test(file.path)?"C":"C++"} pointer guard regression`,category:"external_dependency",targetPath:file.path,confidence:.87,reason:`A pointer-safety guard was found in ${file.path}.`,before:match[0],after:"/* pointer guard removed by incident */",subject:match[1],language:/\.(?:c|h)$/.test(file.path)?"C":"C++"}); }
    else if (file.path.endsWith(".go")) { const match=file.content.match(/if\s+err\s*!=\s*nil\s*\{[\s\S]{0,160}?return[^}]+\}/); if(match)candidates.push({id:candidateId("language-fallback",file.path),kind:"language-fallback",name:"Go error handling regression",category:"external_dependency",targetPath:file.path,confidence:.9,reason:`An explicit Go error boundary was found in ${file.path}.`,before:match[0],after:"// incident: error ignored",subject:"err",language:"Go"}); }
    else if (file.path.endsWith(".rs")) { const match=file.content.match(/([A-Za-z_]\w*)\.unwrap_or(?:_else)?\([^\n;]+\)/); if(match)candidates.push({id:candidateId("language-fallback",file.path),kind:"language-fallback",name:"Rust Option fallback regression",category:"external_dependency",targetPath:file.path,confidence:.9,reason:`A Rust Option fallback was found in ${file.path}.`,before:match[0],after:`${match[1]}.unwrap()`,subject:match[1],language:"Rust"}); }
    else if (/\.(?:rb|php)$/.test(file.path)) { const match=file.content.match(/([A-Za-z_$]\w*)\s*=\s*([^\n;]+?)\s*\|\|\s*([^\n;]+)/); if(match)candidates.push({id:candidateId("language-fallback",file.path),kind:"language-fallback",name:`${file.path.endsWith(".rb")?"Ruby":"PHP"} fallback regression`,category:"external_dependency",targetPath:file.path,confidence:.86,reason:`A runtime fallback was found in ${file.path}.`,before:match[0],after:`${match[1]} = ${match[2]}`,subject:match[1],baselineValue:match[3],language:file.path.endsWith(".rb")?"Ruby":"PHP"}); }
  }

  for (const file of ordered.filter(sourceFile)) {
    const guard = file.content.match(/if\s*\(\s*!([A-Za-z_$][\w$]*)\.ok\s*\)\s*\{[\s\S]{0,300}?\}/);
    if (!guard || !new RegExp(`${escapeRegExp(guard[1])}\\.(?:json|text)\\s*\\(`).test(file.content)) continue;
    candidates.push({ id: candidateId("response-guard", file.path), kind: "response-guard", name: "Upstream error response escapes validation", category: "external_dependency", targetPath: file.path, confidence: 0.89, reason: `A fetch response boundary with explicit status validation was found in ${file.path}.`, before: guard[0], after: "// Incident: an upstream error now continues into response parsing.", subject: guard[1] });
  }

  for (const file of ordered.filter(sourceFile)) {
    const fallback = file.content.match(/process\.env\.([A-Z][A-Z0-9_]*)\s*(?:\?\?|\|\|)\s*(["'`][^"'`\n]{1,100}["'`])/);
    if (!fallback) continue;
    candidates.push({ id: candidateId("environment-fallback", file.path), kind: "environment-fallback", name: "Missing runtime configuration fallback", category: "configuration", targetPath: file.path, confidence: 0.84, reason: `A required runtime value has an explicit fallback in ${file.path}.`, before: fallback[0], after: `process.env.${fallback[1]}!`, environmentName: fallback[1], baselineValue: fallback[2] });
  }

  const packageFile = ordered.find(file => file.path === "package.json");
  if (packageFile) {
    try {
      const parsed = JSON.parse(packageFile.content) as { scripts?: Record<string, unknown> };
      const scriptName = typeof parsed.scripts?.test === "string" ? "test" : typeof parsed.scripts?.build === "string" ? "build" : null;
      const value = scriptName ? parsed.scripts?.[scriptName] : null;
      if (scriptName && typeof value === "string") {
        const pair = new RegExp(`${escapeRegExp(JSON.stringify(scriptName))}\\s*:\\s*${escapeRegExp(JSON.stringify(value))}`).exec(packageFile.content)?.[0];
        if (pair) candidates.push({ id: candidateId("package-script", packageFile.path), kind: "package-script", name: `${scriptName === "test" ? "Test" : "Build"} command regression`, category: "configuration", targetPath: packageFile.path, confidence: 0.76, reason: `The repository exposes a real ${scriptName} command that can be validated without executing untrusted code.`, before: pair, after: `${JSON.stringify(scriptName)}: "missing-rehearsal-command"`, scriptName, baselineValue: value });
      }
    } catch { /* Invalid package metadata is already reported by repository analysis. */ }
  }

  return candidates.sort((left, right) => right.confidence - left.confidence || left.targetPath.localeCompare(right.targetPath));
}

export function incidentCandidatePreviews(files: WorkspaceFile[]): IncidentCandidatePreview[] {
  return discoverIncidentCandidates(files).slice(0, 8).map(({ id, name, category, targetPath, confidence, reason }) => ({ id, name, category, targetPath, confidence, reason }));
}

function incidentCopy(candidate: IncidentCandidate) {
  if (candidate.kind === "container-host") return { summary: "A service that works locally cannot reach its database inside the deployment network.", rootCause: `The isolated copy of ${candidate.targetPath} resolves the database through localhost instead of the repository's container service hostname.`, report: "Requests that need persistence began failing after a configuration rollout.", alert: "database connection refused from application container", impact: ["Database-backed requests", "Service readiness"], unaffected: ["Static routes", "Database container"], logs: [`ERROR runtime-config target=${candidate.targetPath} connect ECONNREFUSED 127.0.0.1:5432`, "INFO database service is accepting connections on the internal network"], database: ["database service | accepting connections", "application container | localhost resolves to itself"], health: ["application DEGRADED dependency connection refused", "database HEALTHY internal listener ready"], hints: ["Compare the application and dependency health signals.", `Inspect the connection value in ${candidate.targetPath}.`, "Remember that localhost has a different meaning inside a container.", "Restore service discovery without disabling network isolation."] };
  if (candidate.kind === "nullable-value") return { summary: "A previously tolerated missing value now crashes a request during normalization.", rootCause: `The isolated copy of ${candidate.targetPath} dereferences ${candidate.subject ?? "an optional value"} without the repository's original null-safe boundary.`, report: "A subset of records now fail while otherwise similar requests still succeed.", alert: `TypeError while normalizing data in ${candidate.targetPath}`, impact: ["Records with missing optional data", "Affected request path"], unaffected: ["Records with complete data", "Service startup"], logs: [`ERROR request TypeError: Cannot read properties of undefined in ${candidate.targetPath}`, "INFO complete records continue to return 200"], database: ["working record | normalized value present", "affected record | normalized value NULL"], health: ["application DEGRADED partial request failures", "primary dependency HEALTHY"], hints: ["Compare a working and failing data shape.", `Inspect normalization in ${candidate.targetPath}.`, "Look for a removed optional-value boundary.", "Restore safe behavior without swallowing unrelated errors."] };
  if (candidate.kind === "response-guard") return { summary: "An upstream error response is parsed as if it were a successful payload.", rootCause: `The status guard in ${candidate.targetPath} was removed, allowing non-success provider responses to reach normal payload parsing.`, report: "Provider synchronization fails only when the upstream service returns a non-success response.", alert: "provider payload parsing error after upstream 503", impact: ["External-provider synchronization", "Retry queue"], unaffected: ["Cached reads", "Requests receiving 2xx responses"], logs: [`ERROR provider-client unexpected payload after upstream status=503 file=${candidate.targetPath}`, "WARN retry queue depth increasing"], database: ["last successful sync | before provider degradation", "affected sync | no state committed"], health: ["provider DEGRADED 503 responses", "application DEGRADED payload errors"], hints: ["Correlate the upstream status with the parsing error.", `Inspect the response boundary in ${candidate.targetPath}.`, "Verify status before consuming the success payload.", "Restore explicit failure handling and keep retries bounded."] };
  if (candidate.kind === "environment-fallback") return { summary: "A runtime that omits an optional environment value now starts with an invalid configuration.", rootCause: `The fallback for ${candidate.environmentName} in ${candidate.targetPath} was removed from the isolated copy.`, report: "One deployment environment fails because an optional configuration value is absent.", alert: `configuration ${candidate.environmentName} is undefined`, impact: ["Environment-specific startup", "Dependent requests"], unaffected: ["Environments defining the value", "Static assets"], logs: [`ERROR config ${candidate.environmentName}=undefined source=${candidate.targetPath}`, "INFO deployment does not define the optional override"], database: ["configuration snapshot | optional override absent"], health: ["application UNHEALTHY configuration invalid", "dependencies HEALTHY"], hints: ["Compare configuration between working and failing environments.", `Inspect ${candidate.environmentName} usage in ${candidate.targetPath}.`, "Decide whether the value is required or should have a safe default.", "Restore validation or a documented fallback."] };
  if (candidate.kind === "language-fallback") return { summary: `A ${candidate.language} value that was safely defaulted now reaches application logic without a fallback.`, rootCause: `The ${candidate.language} fallback for ${candidate.subject} in ${candidate.targetPath} was removed from the isolated copy.`, report: "Requests with a missing optional value now fail while complete inputs still succeed.", alert: `${candidate.language} missing-value failure in ${candidate.targetPath}`, impact: ["Inputs with absent optional values", "Affected application path"], unaffected: ["Complete inputs", "Application startup"], logs: [`ERROR ${candidate.language} missing value reached ${candidate.targetPath}`, "INFO complete inputs continue to pass"], database: ["working input | value present", "affected input | value absent"], health: ["application DEGRADED partial failures", "dependencies HEALTHY"], hints: ["Compare working and failing input shapes.", `Inspect the fallback in ${candidate.targetPath}.`, `Use the normal ${candidate.language} null or default-value idiom.`, "Restore the narrow fallback without swallowing unrelated failures."] };
  return { summary: "The repository's approved quality command no longer resolves.", rootCause: `The ${candidate.scriptName} script in package.json was changed to a command that does not exist.`, report: "The verification pipeline fails before it can execute repository checks.", alert: `${candidate.scriptName} command not found`, impact: ["Repository verification", "Release confidence"], unaffected: ["Source files", "Installed dependency metadata"], logs: [`ERROR npm run ${candidate.scriptName} command not found: missing-rehearsal-command`, "INFO package installation completed"], database: ["source snapshot | unchanged", "package script | invalid command"], health: ["application UNKNOWN verification blocked", "package metadata DEGRADED"], hints: ["Read the failing command output.", "Inspect package.json scripts.", "Compare the command with the repository's installed tooling.", "Restore a valid project-owned quality command."] };
}

export function generateIncidentBlueprint(files: WorkspaceFile[], difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"): GeneratedIncidentBlueprint {
  const candidate = discoverIncidentCandidates(files)[0];
  if (!candidate) throw new Error("No safe, repairable incident boundary was found in this repository. Try a TypeScript or JavaScript project with tests, runtime configuration, fetch calls, or null-safe data handling.");
  const target = files.find(file => file.path === candidate.targetPath);
  if (!target || !target.content.includes(candidate.before)) throw new Error("The selected repository incident boundary is no longer available.");
  const copy = incidentCopy(candidate);
  const severity = difficulty === "ADVANCED" ? "SEV-1" as const : difficulty === "BEGINNER" ? "SEV-3" as const : "SEV-2" as const;
  const template: IncidentTemplate = {
    id: GENERATED_INCIDENT_ID, version: 1, name: candidate.name, category: candidate.category,
    difficulty: difficulty.toLowerCase() as IncidentTemplate["difficulty"], summary: copy.summary, available: true,
    briefing: { title: candidate.name, severity, customerReport: copy.report, initialAlert: copy.alert, knownImpact: copy.impact, unaffectedSystems: copy.unaffected },
    intendedRootCause: copy.rootCause, hints: copy.hints,
  };
  return { version: 1, generator: "repository-brain-v1", candidate, template, targetPath: candidate.targetPath, baselineTarget: target.content, baselineHashes: Object.fromEntries(files.map(file => [file.path, stableHash(file.content)])), testPaths: files.filter(file => /(?:^|\/)(?:test|tests|__tests__)(?:\/|$)|_test\.go$|\.(?:spec|test)\.[jt]sx?$/i.test(file.path)).map(file => file.path), logs: copy.logs, databaseEvidence: copy.database, healthEvidence: copy.health };
}

export function applyGeneratedIncident(files: WorkspaceFile[], blueprint: GeneratedIncidentBlueprint): WorkspaceFile[] {
  return files.map(file => file.path !== blueprint.targetPath ? { ...file } : { ...file, content: file.content.replace(blueprint.candidate.before, blueprint.candidate.after) });
}

export function hasGeneratedWorkspaceEdits(blueprint: GeneratedIncidentBlueprint, files: WorkspaceFile[]): boolean {
  const expectedTarget = blueprint.baselineTarget.replace(blueprint.candidate.before, blueprint.candidate.after);
  const knownPaths = new Set(Object.keys(blueprint.baselineHashes));
  if (files.some(file => !knownPaths.has(file.path))) return true;
  return Object.entries(blueprint.baselineHashes).some(([path, baselineHash]) => {
    const file = files.find(item => item.path === path);
    if (!file) return true;
    const expectedHash = path === blueprint.targetPath ? stableHash(expectedTarget) : baselineHash;
    return stableHash(file.content) !== expectedHash;
  });
}

function contractSatisfied(blueprint: GeneratedIncidentBlueprint, content: string): boolean {
  const candidate = blueprint.candidate;
  if (content === blueprint.baselineTarget || content.includes(candidate.before)) return true;
  if (candidate.kind === "container-host") return !/(?:@|\/\/)(?:localhost|127\.0\.0\.1)(?=[:/])/.test(content) && new RegExp(`@${escapeRegExp(candidate.baselineValue ?? "")}(?=[:/])`, "i").test(content);
  if (candidate.kind === "nullable-value") {
    const subject = escapeRegExp(candidate.subject ?? ""); const method = escapeRegExp(candidate.method ?? "");
    return new RegExp(`${subject}\\s*(?:\\?\\.|\\?\\?|\\|\\|)`).test(content) || new RegExp(`(?:if|typeof)[^\\n]{0,160}${subject}`).test(content) || new RegExp(`${subject}[^\\n]{0,120}${method}`).test(content) && /null|undefined|fallback|default/i.test(content);
  }
  if (candidate.kind === "response-guard") return new RegExp(`if\\s*\\(\\s*!${escapeRegExp(candidate.subject ?? "response")}\\.ok\\s*\\)`).test(content) || new RegExp(`${escapeRegExp(candidate.subject ?? "response")}\\.ok\\s*\\?`).test(content);
  if (candidate.kind === "environment-fallback") return new RegExp(`process\\.env\\.${escapeRegExp(candidate.environmentName ?? "")}\\s*(?:\\?\\?|\\|\\|)`).test(content) || new RegExp(`(?:if|safeParse|parse)[^\\n]{0,160}${escapeRegExp(candidate.environmentName ?? "")}`, "i").test(content);
  if (candidate.kind === "language-fallback") return content.includes(candidate.before) || /\bor\b|\?\?|\?:|\|\||None|null|nil/i.test(content);
  try { const parsed = JSON.parse(content) as { scripts?: Record<string, unknown> }; return parsed.scripts?.[candidate.scriptName ?? ""] === candidate.baselineValue; } catch { return false; }
}

function applyHintPenalty(breakdown: ValidationResult["breakdown"], count: number) {
  let remaining = hintPenalty(Array.from({ length: count }, (_, index) => index + 1));
  for (const label of ["Diagnosis", "Investigation", "Communication"]) {
    const item = breakdown.find(entry => entry.label === label); if (!item || remaining <= 0) continue;
    const deduction = Math.min(item.earned, remaining); item.earned -= deduction; remaining -= deduction;
  }
}

export function evaluateGeneratedIncident(blueprint: GeneratedIncidentBlueprint, files: WorkspaceFile[], context: EvaluationContext): ValidationResult {
  const target = files.find(file => file.path === blueprint.targetPath)?.content ?? "";
  const changedPaths = files.filter(file => blueprint.baselineHashes[file.path] !== stableHash(file.content)).map(file => file.path);
  const missingPaths = Object.keys(blueprint.baselineHashes).filter(path => !files.some(file => file.path === path));
  const repaired = Boolean(target) && target !== blueprint.candidate.after && contractSatisfied(blueprint, target);
  const unsafe = files.some(file => /always return success|@ts-ignore|describe\.skip|it\.skip|missing-rehearsal-command|--network\s+host|privileged:\s*true/i.test(file.content));
  const scopeSafe = changedPaths.length <= 12 && missingPaths.length === 0 && target.length >= Math.max(20, Math.floor(blueprint.baselineTarget.length * 0.45));
  const checks: ValidationResult["checks"] = [
    { name: "Incident behavior restored", status: repaired ? "passed" : "failed", detail: repaired ? "The repository-derived failure contract now handles the affected input safely." : "The original customer symptom is still reproducible from the submitted workspace." },
    { name: "Original repository contract", status: repaired && target !== blueprint.candidate.after ? "passed" : "failed", hidden: true, detail: repaired ? "The target preserves the repository's known-good behavior boundary." : "The target still matches the injected regression or violates its baseline contract." },
    { name: "Unsafe shortcut scan", status: unsafe ? "failed" : "passed", hidden: true, detail: unsafe ? "A disabled check, blanket success, unsafe runtime mode, or injected placeholder remains." : "No blanket suppression or unsafe bypass was detected." },
    { name: "Bounded change scope", status: scopeSafe ? "passed" : "failed", hidden: true, detail: scopeSafe ? changedPaths.length ? `${changedPaths.length} file${changedPaths.length === 1 ? " intentionally differs" : "s intentionally differ"} from the original snapshot and the repository structure remains intact.` : "The repair restores the original snapshot and its repository structure remains intact." : "The patch deletes source or changes too much of the repository to validate safely." },
  ];
  const passed = checks.every(check => check.status === "passed");
  const events = context.timeline;
  if (unsafe || !scopeSafe) return { passed: false, score: -25, checks, breakdown: [{ label: "Diagnosis", earned: 0, possible: 25 }, { label: "Investigation", earned: 0, possible: 20 }, { label: "Fix quality", earned: -25, possible: 25 }, { label: "Verification", earned: 0, possible: 15 }, { label: "Prevention", earned: 0, possible: 10 }, { label: "Communication", earned: 0, possible: 5 }] };
  const commands = new Set(events.filter(item => item.type === "command_run" || item.type === "evidence_viewed").map(item => item.commandId).filter(Boolean));
  const openedFiles = new Set(events.filter(item => item.type === "file_opened").map(item => item.path).filter(Boolean));
  const firstEdit = events.findIndex(item => item.type === "file_edited");
  const evidenceBeforeEdit = firstEdit < 0 ? events.length : events.slice(0, firstEdit).filter(item => item.type === "file_opened" || item.type === "command_run" || item.type === "evidence_viewed").length;
  const hypotheses = context.hypotheses.join(" ");
  const rootTerms = blueprint.template.intendedRootCause.toLowerCase().match(/[a-z][a-z-]{5,}/g) ?? [];
  const diagnosis = Math.min(25, 5 + (context.hypotheses.length ? 8 : 0) + (openedFiles.has(blueprint.targetPath) ? 6 : 0) + (rootTerms.some(term => hypotheses.toLowerCase().includes(term)) ? 6 : 0));
  const investigation = Math.min(20, Math.min(8, openedFiles.size * 2) + Math.min(9, commands.size * 3) + Math.min(3, evidenceBeforeEdit));
  const fixQuality = (repaired ? 15 : 0) + (!unsafe ? 5 : 0) + (scopeSafe ? 5 : 0);
  const verification = Math.min(15, (commands.has("run-tests") ? 7 : 0) + (commands.has("check-health") ? 4 : 0) + (commands.has("run-build") || commands.has("run-lint") ? 2 : 0) + (commands.has("restart-service") ? 2 : 0));
  const testChanged = blueprint.testPaths.some(path => changedPaths.includes(path));
  const prevention = Math.min(10, (testChanged ? 7 : 0) + (repaired && target !== blueprint.baselineTarget ? 3 : repaired ? 2 : 0));
  const communication = Math.min(5, (context.hypotheses.length ? 2 : 0) + (/because|evidence|log|record|response|config|test/i.test(hypotheses) ? 2 : 0) + (context.hypotheses.length > 1 ? 1 : 0));
  const breakdown = [{ label: "Diagnosis", earned: diagnosis, possible: 25 }, { label: "Investigation", earned: investigation, possible: 20 }, { label: "Fix quality", earned: fixQuality, possible: 25 }, { label: "Verification", earned: verification, possible: 15 }, { label: "Prevention", earned: prevention, possible: 10 }, { label: "Communication", earned: communication, possible: 5 }];
  applyHintPenalty(breakdown, context.hintCount);
  return { passed, score: breakdown.reduce((sum, item) => sum + item.earned, 0), checks, breakdown };
}
