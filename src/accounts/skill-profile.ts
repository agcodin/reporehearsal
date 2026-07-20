export type SkillBreakdownItem = { label: string; earned: number; possible: number };
export type SkillAverage = { label: string; percent: number; sampleSize: number };

// Canonical order and possible-point weights, so a skill missing from an older record still
// appears (at 0 samples) instead of silently dropping out of the profile.
const SKILL_LABELS = ["Diagnosis", "Investigation", "Fix quality", "Verification", "Prevention", "Communication"] as const;

export function skillAverages(breakdowns: SkillBreakdownItem[][]): SkillAverage[] {
  return SKILL_LABELS.map(label => {
    const items = breakdowns.map(breakdown => breakdown.find(item => item.label === label)).filter((item): item is SkillBreakdownItem => Boolean(item && item.possible > 0));
    if (items.length === 0) return { label, percent: 0, sampleSize: 0 };
    // A negative earned (unsafe-regression penalty) floors at 0 so the profile reads as a skill level.
    const ratio = items.reduce((sum, item) => sum + Math.max(0, item.earned) / item.possible, 0) / items.length;
    return { label, percent: Math.round(ratio * 100), sampleSize: items.length };
  });
}

export function weakestSkill(averages: SkillAverage[]): SkillAverage | null {
  const measured = averages.filter(average => average.sampleSize > 0);
  if (measured.length === 0) return null;
  return measured.reduce((lowest, average) => average.percent < lowest.percent ? average : lowest);
}

// One concrete thing to do differently next rehearsal, tied to the weakest skill.
export function coachingFor(label: string): string {
  switch (label) {
    case "Diagnosis": return "Write a root-cause hypothesis that names the failing mechanism before you edit.";
    case "Investigation": return "Open the failing file and run the evidence commands before making a change.";
    case "Fix quality": return "Repair the actual behavior instead of suppressing the check; keep the change small.";
    case "Verification": return "Run the tests and a health check after your edit, not just before.";
    case "Prevention": return "Add or update a regression test so the fault cannot silently return.";
    case "Communication": return "Record why you believe the fix works, citing the evidence you used.";
    default: return "Complete more rehearsals to build this skill.";
  }
}
