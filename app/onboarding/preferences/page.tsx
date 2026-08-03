import { redirect } from "next/navigation";
import { onboardingPath, onboardingSelection, type OnboardingQuery } from "../shared";

/** Compatibility redirect for prior onboarding links. Preferences are no longer a signup step. */
export default async function PreferencesPage({ searchParams }: { searchParams: Promise<OnboardingQuery> }) {
  const selection = onboardingSelection(await searchParams);
  redirect(onboardingPath("plan", selection.plan, selection.billing));
}
