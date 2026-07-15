import type { ValidationResult } from "../types";

export function hintPenalty(levels: number[]): number { return Math.min(12, levels.reduce((sum, level) => sum + ([0,1,2,4,7][level] ?? 0), 0)); }

export function evaluateRepair(source: string, hintCount = 0): ValidationResult {
  const backfill = /UPDATE\s+billing_profiles[\s\S]*WHERE\s+billing_region\s+IS\s+NULL/i.test(source);
  const creationPath = /billingRegion:\s*input\.billingRegion\s*\?\?/.test(source);
  const nullSafety = /profile\.billingRegion\s*\?\?/.test(source);
  const unsafe = /always return success|catch\s*\([^)]*\)\s*\{\s*return\s*\{?\s*status:\s*200|drop\s+not\s+null|it\.skip|describe\.skip/i.test(source);
  const checks = [
    { name: "Failing account billing page", status: nullSafety ? "passed" as const : "failed" as const, detail: nullSafety ? "Returns a valid region for legacy null data." : "The serializer still crashes on a missing region." },
    { name: "Partner-import account creation", status: creationPath ? "passed" as const : "failed" as const, hidden: true, detail: creationPath ? "Every supported creation path writes a valid region." : "The secondary path can still create invalid data." },
    { name: "Legacy snapshot migration", status: backfill ? "passed" as const : "failed" as const, hidden: true, detail: backfill ? "Legacy null records are explicitly backfilled." : "No safe backfill for legacy data was detected." },
    { name: "Dangerous shortcut scan", status: unsafe ? "failed" as const : "passed" as const, hidden: true, detail: unsafe ? "A blanket suppression, removed constraint, or disabled test was detected." : "No blanket suppression, hardcoded success, constraint removal, or test deletion detected." },
  ];
  const passed=checks.every(c=>c.status==="passed"); const penalty=Math.min(12,hintCount<=0?0:hintPenalty(Array.from({length:hintCount},(_,i)=>i+1)));
  const breakdown=[{label:"Diagnosis",earned:passed?24:12,possible:25},{label:"Investigation",earned:passed?18:11,possible:20},{label:"Fix quality",earned:passed?25:8,possible:25},{label:"Verification",earned:passed?14:7,possible:15},{label:"Prevention",earned:passed?9:4,possible:10},{label:"Communication",earned:5,possible:5}];
  return {passed,score:Math.max(0,breakdown.reduce((s,b)=>s+b.earned,0)-penalty),checks,breakdown};
}
