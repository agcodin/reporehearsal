import type { Metadata } from "next";
import Link from "next/link";
import { getAuthenticatedUser, providerLabel, signInPath } from "../../auth";
import OnboardingProgress from "../OnboardingProgress";
import { onboardingPath, onboardingSelection, type OnboardingQuery } from "../shared";

export const metadata: Metadata = { title: "Create your account" };

export default async function AccountStep({ searchParams }: { searchParams: Promise<OnboardingQuery> }) {
  const selection = onboardingSelection(await searchParams);
  const next = onboardingPath("preferences", selection.plan, selection.billing);
  const user = await getAuthenticatedUser();
  return <main className="onboarding-page"><div className="onboarding-shell">
    <OnboardingProgress current={1} />
    <section className="onboarding-panel onboarding-account">
      <p className="eyebrow">CREATE YOUR ACCOUNT</p><h1>{user ? "Your account is ready." : "Save your work and results."}</h1>
      <p>{user ? "Confirm the account below, then choose how you want your rehearsals to work." : "An account keeps your repository library, practice history, scores, and plan settings together."}</p>
      {user ? <div className="account-confirmation"><span aria-hidden>{user.displayName.slice(0, 1).toUpperCase()}</span><div><b>{user.displayName}</b><small>{user.email} · Signed in with {providerLabel(user.provider)}</small></div></div> : <ul className="onboarding-checklist"><li>✓ Save grading reports and progress</li><li>✓ Import repositories into your private library</li><li>✓ Manage or cancel a plan from account settings</li></ul>}
      <div className="onboarding-actions">{user ? <Link className="button button-dark" href={next}>Continue to preferences →</Link> : <Link className="button button-dark" href={signInPath(next)}>Sign in or create account →</Link>}<Link className="text-link" href="/pricing">Back to pricing</Link></div>
      {!user && <small className="onboarding-footnote">Creating an account does not start a paid plan or require a card.</small>}
    </section>
  </div></main>;
}
