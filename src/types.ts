export type IncidentCategory = "database" | "configuration" | "external_dependency";
export type Difficulty = "beginner" | "intermediate" | "advanced";

export type IncidentTemplate = {
  id: string;
  version: number;
  name: string;
  category: IncidentCategory;
  difficulty: Difficulty;
  summary: string;
  available: boolean;
  briefing: {
    title: string;
    severity: "SEV-1" | "SEV-2" | "SEV-3";
    customerReport: string;
    initialAlert: string;
    knownImpact: string[];
    unaffectedSystems: string[];
  };
  intendedRootCause: string;
  hints: string[];
};

export type RepositoryMap = {
  repositoryId: string;
  name: string;
  language: string;
  framework: string;
  packageManager: string;
  database: string;
  orm: string;
  testFramework: string;
  containerized: boolean;
  entryPoints: string[];
  services: { name: string; files: string[]; routes: string[] }[];
  databaseModels: { name: string; fields: string[] }[];
  migrations: string[];
  environmentVariables: { name: string; required: boolean; secret: boolean }[];
  testFiles: string[];
  healthChecks: string[];
  riskAreas: { type: string; description: string; relatedFiles: string[]; confidence: number }[];
};

export type ValidationResult = {
  passed: boolean;
  score: number;
  checks: { name: string; status: "passed" | "failed"; hidden?: boolean; detail: string }[];
  breakdown: { label: string; earned: number; possible: number }[];
};
