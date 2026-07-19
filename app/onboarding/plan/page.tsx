import type { Metadata } from "next";
import OnboardingProgress from "../OnboardingProgress";
import { onboardingSelection, type OnboardingQuery } from "../shared";
import PlanStep from "./PlanStep";

export const metadata: Metadata = { title: "Choose a plan" };
export default async function PlanPage({ searchParams }: { searchParams: Promise<OnboardingQuery> }) { const selection = onboardingSelection(await searchParams); return <main className="onboarding-page"><div className="onboarding-shell onboarding-shell-wide"><OnboardingProgress current={3} /><PlanStep initialPlan={selection.plan} initialBilling={selection.billing} /></div></main>; }
