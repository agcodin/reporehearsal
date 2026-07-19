import { Suspense } from "react";
import Link from "next/link";
import { providerLabel, requireAuthenticatedUser, signOutPath } from "../auth";
import { getAccountDashboard } from "../../src/accounts/account-service";
import AccountSettings from "./AccountSettings";
import AccountManagement from "./AccountManagement";

export const dynamic = "force-dynamic";

async function AccountContent() {
  const user = await requireAuthenticatedUser("/account"); const data = await getAccountDashboard(user.email, user.displayName);
  return <main className="app-page account-page"><div className="page-title-row"><div><p className="eyebrow">YOUR ACCOUNT</p><h1>{data.profile.displayName}</h1><p>{data.profile.email} · Signed in with {providerLabel(user.provider)} · Member since {new Date(data.profile.createdAt).toLocaleDateString()}</p></div><Link className="button button-ghost" href={signOutPath("/")}>Sign out</Link></div><div className="account-grid"><section className="panel"><span className="panel-label">REHEARSAL PREFERENCES</span><h2>Default exercise setup</h2><p>Choose how new exercises should begin. You can still change these settings per rehearsal.</p><AccountSettings profile={data.profile} /></section><aside className="panel"><span className="panel-label">ACCOUNT SUMMARY</span><h2>Your progress</h2><div className="account-summary-row"><span>Completed rehearsals</span><b>{data.metrics.completed}</b></div><div className="account-summary-row"><span>Saved repositories</span><b>{data.repositories.length}</b></div><div className="account-summary-row"><span>Average score</span><b>{data.metrics.averageScore ?? "—"}</b></div><div className="account-summary-row"><span>Completion rate</span><b>{data.metrics.completionRate === null ? "—" : `${data.metrics.completionRate}%`}</b></div><Link className="button button-blue" href="/dashboard">View dashboard →</Link></aside></div><AccountManagement email={data.profile.email}/><section className="privacy-note"><b>Account privacy</b><p>Your account stores identity, preferences, results, repository metadata, and reusable safe source snapshots. Excluded secrets, provider passwords, provider access tokens, and original repositories are never stored.</p></section></main>;
}

export default function AccountPage() { return <Suspense fallback={<main className="app-page"><div className="account-loading"><span className="pulse" /> Loading your account…</div></main>}><AccountContent /></Suspense>; }
