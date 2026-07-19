import type { Metadata } from "next";
import { requireAuthenticatedUser } from "../../auth";
import OnboardingProgress from "../OnboardingProgress";
import { onboardingPath, onboardingSelection, type OnboardingQuery } from "../shared";
import PreferencesStep from "./PreferencesStep";

export const metadata: Metadata = { title: "Practice preferences" };

export default async function PreferencesPage({ searchParams }: { searchParams: Promise<OnboardingQuery> }) {
  const selection = onboardingSelection(await searchParams);
  await requireAuthenticatedUser(onboardingPath("preferences", selection.plan, selection.billing));
  return <main className="onboarding-page"><div className="onboarding-shell"><OnboardingProgress current={2} /><PreferencesStep plan={selection.plan} billing={selection.billing} /></div></main>;
}
