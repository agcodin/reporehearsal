import type { IncidentCategory } from "../types";
import type { AccountRehearsal } from "./types";

// Adaptive recommendations switch on once the user has solved this many rehearsals.
export const UNLOCK_THRESHOLD = 5;

const CATEGORY_ORDER: IncidentCategory[] = ["database", "configuration", "external_dependency"];
const CATEGORY_LABEL: Record<IncidentCategory, string> = {
  database: "Database failures",
  configuration: "Configuration failures",
  external_dependency: "External dependency failures",
};
// A representative starter incident per category, so a recommendation links straight into a rehearsal.
const CATEGORY_INCIDENT: Record<IncidentCategory, string> = {
  database: "db-required-field-migration-v1",
  configuration: "container-host-config-v1",
  external_dependency: "provider-schema-drift-v1",
};

export type TrainingRecommendation =
  | { unlocked: false; solved: number; needed: number }
  | { unlocked: true; solved: number; needed: number; kind: "new" | "weakness"; category: IncidentCategory; categoryLabel: string; incidentId: string; reason: string; averageScore: number | null };

// Locked until the user solves `threshold` rehearsals. Then it recommends breadth first — any
// category never attempted becomes the "new skill" to introduce — and depth after: once every
// track has been touched, the lowest-scoring one is surfaced to sharpen.
export function recommendedTraining(rehearsals: AccountRehearsal[], threshold = UNLOCK_THRESHOLD): TrainingRecommendation {
  const solved = rehearsals.filter(item => item.status === "COMPLETED").length;
  if (solved < threshold) return { unlocked: false, solved, needed: threshold };

  const attempted = new Set(rehearsals.map(item => item.category).filter(Boolean));
  const uncovered = CATEGORY_ORDER.filter(category => !attempted.has(category));
  if (uncovered.length) return introduce(uncovered[0], solved, threshold);

  const averages = CATEGORY_ORDER
    .map(category => ({ category, average: averageScore(rehearsals, category) }))
    .filter((entry): entry is { category: IncidentCategory; average: number } => entry.average !== null);
  if (!averages.length) return introduce(CATEGORY_ORDER[0], solved, threshold);

  const weakest = averages.reduce((lowest, entry) => entry.average < lowest.average ? entry : lowest);
  return {
    unlocked: true, solved, needed: threshold, kind: "weakness", category: weakest.category,
    categoryLabel: CATEGORY_LABEL[weakest.category], incidentId: CATEGORY_INCIDENT[weakest.category],
    reason: `${CATEGORY_LABEL[weakest.category]} is your lowest-scoring track (avg ${weakest.average}). Sharpen it.`,
    averageScore: weakest.average,
  };
}

function introduce(category: IncidentCategory, solved: number, needed: number): TrainingRecommendation {
  return {
    unlocked: true, solved, needed, kind: "new", category,
    categoryLabel: CATEGORY_LABEL[category], incidentId: CATEGORY_INCIDENT[category],
    reason: `You have not practiced ${CATEGORY_LABEL[category].toLowerCase()} yet. Add this track to your rotation.`,
    averageScore: null,
  };
}

function averageScore(rehearsals: AccountRehearsal[], category: IncidentCategory): number | null {
  const scored = rehearsals.filter(item => item.category === category);
  return scored.length ? Math.round(scored.reduce((sum, item) => sum + item.score, 0) / scored.length) : null;
}
