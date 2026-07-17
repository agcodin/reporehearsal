import Link from "next/link";
import { chatGPTSignInPath, getAuthenticatedUser, oauthSignInPath, safeRelativeReturnPath } from "../auth";
import { providerIsConfigured } from "../../src/auth/oauth-providers";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  not_configured: "This sign-in method still needs its provider credentials.",
  state: "The sign-in request could not be verified. Please try again.",
  expired: "The sign-in request expired. Please try again.",
  cancelled: "Sign-in was cancelled before access was granted.",
  verified_email_required: "The provider did not return a verified email address.",
  token_exchange_failed: "The provider could not complete sign-in. Please try again.",
  callback_failed: "Sign-in could not be completed. Please try again.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ return_to?: string; error?: string }> }) {
  const user = await getAuthenticatedUser();
  if (user) return <main className="signin-page"><section className="signin-card"><span className="badge badge-green">SIGNED IN</span><h1>Welcome back, {user.displayName}</h1><p>Your rehearsal history, preferences, and imported repository snapshots are saved to this account.</p><div className="signin-actions"><Link className="button button-dark" href="/dashboard">Open dashboard →</Link><Link className="button button-ghost" href="/repositories">Choose a repository</Link></div></section></main>;
  const query = await searchParams;
  const returnTo = safeRelativeReturnPath(query.return_to ?? "/dashboard");
  const error = query.error ? errorMessages[query.error] ?? "Sign-in could not be completed. Please try again." : null;
  const googleConfigured = providerIsConfigured("google");
  const githubConfigured = providerIsConfigured("github");
  return <main className="signin-page"><div className="signin-layout"><aside className="signin-context"><p className="eyebrow">YOUR READINESS RECORD</p><h2>Keep the evidence of how you investigate.</h2><p>Scores are more useful when they form a pattern. An account turns individual rehearsals into a durable view of diagnosis, evidence, repair, verification, and prevention.</p><div className="signin-signal"><span><small>DIAGNOSIS</small><i style={{ width: "88%" }} /></span><span><small>EVIDENCE</small><i style={{ width: "76%" }} /></span><span><small>VERIFICATION</small><i style={{ width: "82%" }} /></span></div><small>Illustrative readiness profile</small></aside><section className="signin-card"><p className="eyebrow">OPTIONAL ACCOUNT</p><h1>Save your rehearsal progress</h1><p>Public cases, GitHub imports, and local uploads work without an account. Sign in when you want history, preferences, and safe repository snapshots to follow you.</p>{error && <p className="signin-error" role="alert">{error}</p>}<div className="provider-list"><Link className="provider-button" href={chatGPTSignInPath(returnTo)}><span className="provider-mark">OA</span><span><b>Continue with ChatGPT</b><small>Secure sign-in is handled by OpenAI</small></span><strong>→</strong></Link>{googleConfigured ? <Link className="provider-button" href={oauthSignInPath("google", returnTo)}><span className="provider-mark provider-google">G</span><span><b>Continue with Google</b><small>Use a verified Google email</small></span><strong>→</strong></Link> : <span className="provider-button provider-disabled" aria-disabled="true"><span className="provider-mark provider-google">G</span><span><b>Continue with Google</b><small>Provider setup required</small></span><strong>—</strong></span>}{githubConfigured ? <Link className="provider-button" href={oauthSignInPath("github", returnTo)}><span className="provider-mark provider-github">GH</span><span><b>Continue with GitHub</b><small>Requests verified email access only</small></span><strong>→</strong></Link> : <span className="provider-button provider-disabled" aria-disabled="true"><span className="provider-mark provider-github">GH</span><span><b>Continue with GitHub</b><small>Provider setup required</small></span><strong>—</strong></span>}</div><div className="signin-divider"><span>ACCOUNT BOUNDARY</span></div><ul className="signin-benefits"><li>Save verified scores and completed rehearsals</li><li>Remember practice-mode and time-limit defaults</li><li>Reuse filtered GitHub and local source snapshots</li><li>Passwords, provider tokens, excluded secrets, and originals are never stored</li></ul><Link className="text-link" href="/repositories">Continue without an account →</Link></section></div></main>;
}
