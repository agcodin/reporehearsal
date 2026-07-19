import type { WorkspaceFile } from "../rehearsals/types";
import { generateIncidentBlueprint, preventionForGeneratedIncident, type GeneratedIncidentBlueprint } from "./brain";

export type IncidentQualityFinding = { code: string; message: string };
const assertionPattern = /(?:\bexpect\b|\bassert\b|\bassertEquals\b|Assert\.|assert_eq!|t\.(?:Fatal|Error))/i;

export function auditGeneratedIncident(blueprint: GeneratedIncidentBlueprint, files: WorkspaceFile[]): IncidentQualityFinding[] {
  const findings: IncidentQualityFinding[] = [];
  const rootCause = blueprint.template.intendedRootCause.toLowerCase();
  if (!rootCause.includes(blueprint.targetPath.toLowerCase())) findings.push({ code: "ROOT_CAUSE_TARGET_MISMATCH", message: "Root cause does not identify the injected target file." });
  const prevention = preventionForGeneratedIncident(blueprint).join(" ").toLowerCase();
  const expected = blueprint.candidate.kind === "container-host" ? /host|container|network/ : blueprint.candidate.kind === "response-guard" ? /status|response|provider/ : blueprint.candidate.kind === "environment-fallback" ? /environment|config/ : blueprint.candidate.kind === "package-script" ? /script|command|tool/ : /missing|fallback|null|default/;
  if (!expected.test(prevention)) findings.push({ code: "PREVENTION_CLASS_MISMATCH", message: `Prevention copy does not match ${blueprint.candidate.kind}.` });
  const tests = files.filter(file => blueprint.testPaths.includes(file.path));
  if (!tests.length) findings.push({ code: "NO_INCIDENT_TEST", message: "No test file backs the generated incident." });
  if (tests.length && !tests.some(file => assertionPattern.test(file.content))) findings.push({ code: "EMPTY_TEST", message: "Test files contain no meaningful assertion." });
  if (!blueprint.template.briefing.initialAlert.trim() || blueprint.template.hints.length < 3) findings.push({ code: "INCOMPLETE_EVIDENCE", message: "Incident evidence or coaching is incomplete." });
  const severity = blueprint.template.briefing.severity;
  const expectedSeverity = blueprint.template.difficulty === "advanced" ? "SEV-1" : blueprint.template.difficulty === "beginner" ? "SEV-3" : "SEV-2";
  if (severity !== expectedSeverity) findings.push({ code: "DIFFICULTY_MISMATCH", message: "Difficulty and severity do not agree." });
  return findings;
}

export function auditIncidentMatrix(samples: Record<string, { files: WorkspaceFile[] }>) {
  return Object.entries(samples).flatMap(([repositoryId, sample]) => (["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const).map(difficulty => {
    try { const blueprint = generateIncidentBlueprint(sample.files, difficulty); return { repositoryId, difficulty, blueprint, findings: auditGeneratedIncident(blueprint, sample.files) }; }
    catch (error) { return { repositoryId, difficulty, blueprint: null, findings: [{ code: "NO_GENERATOR_CANDIDATE", message: error instanceof Error ? error.message : "No incident candidate." }] }; }
  }));
}
