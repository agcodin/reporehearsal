import { isBillingCadence, isPlanId, type BillingCadence, type PlanId } from "../../src/billing/plans";

export type OnboardingQuery = { plan?: string; billing?: string };

export function onboardingSelection(query: OnboardingQuery): { plan: PlanId; billing: BillingCadence } {
  return {
    plan: isPlanId(query.plan ?? null) ? query.plan as PlanId : "PRO",
    billing: isBillingCadence(query.billing ?? null) ? query.billing as BillingCadence : "monthly",
  };
}

export function onboardingPath(step: "account" | "plan" | "checkout", plan: PlanId, billing: BillingCadence) {
  return `/onboarding/${step}?plan=${plan}&billing=${billing}`;
}
