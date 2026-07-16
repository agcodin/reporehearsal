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
};

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
    features: ["Four production-style incidents", "Public GitHub and local uploads", "Deterministic validation", "Basic after-action report"],
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
    features: ["Everything in Free", "Interview mode", "Advanced skill analysis", "Saved progress with ChatGPT", "Reusable repository library"],
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
    features: ["Everything in Pro", "Team readiness dashboard", "Learning-path assignments", "Shared rehearsal library", "Manager reporting"],
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
    features: ["Everything in Team", "Custom incident studio", "Security and retention controls", "Audit-ready exports", "Facilitated GameDay support"],
  },
];

export const planRank: Record<PlanId, number> = { FREE: 0, PRO: 1, TEAM: 2, ENTERPRISE: 3 };

export function isPlanId(value: string | null): value is PlanId {
  return value === "FREE" || value === "PRO" || value === "TEAM" || value === "ENTERPRISE";
}

export function planFor(id: PlanId) {
  return plans.find(plan => plan.id === id) ?? plans[0];
}
