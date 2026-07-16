export type PlanId = "FREE" | "PRO" | "TEAM" | "ENTERPRISE";

export type Plan = {
  id: PlanId;
  name: string;
  eyebrow: string;
  price: string;
  cadence: string;
  description: string;
  cta: string;
  href: string;
  featured?: boolean;
  features: string[];
  limits: PlanLimits;
};

export type PlanLimits = {
  repositoryUploadBytes: number;
  repositoryFiles: number;
  maxTextFileBytes: number;
};

const MB = 1024 * 1024;

export const plans: Plan[] = [
  {
    id: "FREE",
    name: "Free",
    eyebrow: "EXPLORE THE LOOP",
    price: "$0",
    cadence: "forever",
    description: "Learn the incident workflow with public cases and temporary codebase analysis.",
    cta: "Use Free",
    href: "/rehearsals/new",
    features: ["Four production-style incidents", "20 MB repository analysis", "Public GitHub and local uploads", "Deterministic validation", "Basic after-action report"],
    limits: { repositoryUploadBytes: 20 * MB, repositoryFiles: 3_000, maxTextFileBytes: 1 * MB },
  },
  {
    id: "PRO",
    name: "Pro",
    eyebrow: "BUILD PERSONAL READINESS",
    price: "$19",
    cadence: "per month",
    description: "Practice independently, keep your progress, and get deeper coaching after every repair.",
    cta: "Activate Pro preview",
    href: "/dashboard",
    featured: true,
    features: ["Everything in Free", "50 MB repository analysis", "Interview mode", "Advanced skill analysis", "Saved progress with ChatGPT", "Reusable repository library"],
    limits: { repositoryUploadBytes: 50 * MB, repositoryFiles: 7_500, maxTextFileBytes: 2 * MB },
  },
  {
    id: "TEAM",
    name: "Team",
    eyebrow: "TRAIN ENGINEERING TEAMS",
    price: "$39",
    cadence: "per user / month",
    description: "Turn incident practice into an assignable, measurable engineering program.",
    cta: "Activate Team preview",
    href: "/team",
    features: ["Everything in Pro", "75 MB repository analysis", "Team readiness dashboard", "Learning-path assignments", "Shared rehearsal library", "Manager reporting"],
    limits: { repositoryUploadBytes: 75 * MB, repositoryFiles: 15_000, maxTextFileBytes: 4 * MB },
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    eyebrow: "OPERATIONALIZE RELIABILITY",
    price: "Custom",
    cadence: "annual agreement",
    description: "Model your own incidents and prepare teams around the systems they actually operate.",
    cta: "Activate Enterprise preview",
    href: "/enterprise",
    features: ["Everything in Team", "100 MB repository analysis", "Custom incident studio", "Security and retention controls", "Audit-ready exports", "Facilitated GameDay support"],
    limits: { repositoryUploadBytes: 100 * MB, repositoryFiles: 30_000, maxTextFileBytes: 8 * MB },
  },
];

export const planRank: Record<PlanId, number> = { FREE: 0, PRO: 1, TEAM: 2, ENTERPRISE: 3 };

export function isPlanId(value: string | null): value is PlanId {
  return value === "FREE" || value === "PRO" || value === "TEAM" || value === "ENTERPRISE";
}

export function planFor(id: PlanId) {
  return plans.find(plan => plan.id === id) ?? plans[0];
}

export function planFromRequest(request: Request) {
  const value = request.headers.get("x-reporehearsal-plan");
  return planFor(isPlanId(value) ? value : "FREE");
}

export function formatBytes(bytes: number) {
  return `${Math.round(bytes / MB)} MB`;
}
