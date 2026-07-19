import type { Metadata } from "next";
import { requireAuthenticatedUser } from "../../auth";
import { chargeForCadence, planFor } from "../../../src/billing/plans";
import OnboardingProgress from "../OnboardingProgress";
import { onboardingPath, onboardingSelection, type OnboardingQuery } from "../shared";
import CheckoutStep from "./CheckoutStep";

export const metadata: Metadata = { title: "Review and checkout" };
export default async function CheckoutPage({ searchParams }: { searchParams: Promise<OnboardingQuery> }) {
  const selection = onboardingSelection(await searchParams); const user = await requireAuthenticatedUser(onboardingPath("checkout", selection.plan, selection.billing)); const plan = planFor(selection.plan); const charge = chargeForCadence(plan, selection.billing);
  return <main className="onboarding-page"><div className="onboarding-shell onboarding-shell-wide"><OnboardingProgress current={4} /><CheckoutStep plan={plan} billing={selection.billing} charge={charge} email={user.email} /></div></main>;
}
