export type PlanId = "FREE" | "PRO" | "TEAM";
export type BillingCadence = "weekly" | "monthly" | "annual";

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
  repositoryUploadBytes: number | null;
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
    description: "Learn the incident workflow with starter cases and the shared Challenge of the Day.",
    cta: "Use Free",
    href: "/rehearsals/new",
    features: ["Four production-style incidents", "Challenge of the Day", "20 MB repository analysis", "Deterministic validation", "Basic after-action report"],
    limits: { repositoryUploadBytes: 20 * MB, repositoryFiles: 3_000, maxTextFileBytes: 1 * MB },
  },
  {
    id: "PRO",
    name: "Pro",
    eyebrow: "BUILD PERSONAL READINESS",
    price: "$9.99",
    cadence: "per month",
    description: "Practice independently, keep your progress, and get deeper coaching after every repair.",
    cta: "Activate Pro preview",
    href: "/dashboard",
    features: ["Everything in Free", "75 MB repository analysis", "110-project repository roulette", "Interview mode", "Advanced grading reports", "Saved progress", "Reusable repository library"],
    limits: { repositoryUploadBytes: 75 * MB, repositoryFiles: 15_000, maxTextFileBytes: 4 * MB },
  },
  {
    id: "TEAM",
    name: "Team",
    eyebrow: "TRAIN ENGINEERING TEAMS",
    price: "$19.99",
    cadence: "per month",
    description: "Unlimited repository analysis and the complete reliability-training toolkit for teams.",
    cta: "Activate Team preview",
    href: "/team",
    featured: true,
    features: ["Everything in Pro", "Unlimited repository analysis", "Five invited member seats", "Repository assignments", "Team results dashboard", "Shared rehearsal library", "Manager reporting", "Custom incident studio", "Security and retention controls", "Audit-ready exports", "Facilitated GameDay support"],
    limits: { repositoryUploadBytes: null, repositoryFiles: 100_000, maxTextFileBytes: 16 * MB },
  },
];

export const planRank: Record<PlanId, number> = { FREE: 0, PRO: 1, TEAM: 2 };

export function isPlanId(value: string | null): value is PlanId {
  return value === "FREE" || value === "PRO" || value === "TEAM";
}

export function planFor(id: PlanId) {
  return plans.find(plan => plan.id === id) ?? plans[0];
}

export function planFromRequest(request: Request) {
  const value = request.headers.get("x-reporehearsal-plan");
  return planFor(isPlanId(value) ? value : "FREE");
}

export function priceForCadence(plan: Plan, billing: BillingCadence) {
  if (plan.id === "FREE") return { price: "$0", cadence: "forever" };
  if (billing === "weekly") return { price: plan.id === "PRO" ? "$3" : "$6", cadence: "per week" };
  if (billing === "annual") return { price: `$${(Number(plan.price.slice(1)) * .8).toFixed(2)}`, cadence: "per month, billed annually" };
  return { price: plan.price, cadence: plan.cadence };
}

export function formatBytes(bytes: number | null) { return bytes === null ? "Unlimited" : `${Math.round(bytes / MB)} MB`; }
