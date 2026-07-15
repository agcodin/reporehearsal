import Link from "next/link";
import { chatGPTSignInPath, getChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const user = await getChatGPTUser();
  if (user) return <main className="signin-page"><section className="signin-card"><span className="badge badge-green">SIGNED IN</span><h1>Welcome back, {user.displayName}</h1><p>Your rehearsal history, preferences, and imported repository metadata are saved to this account.</p><div className="signin-actions"><Link className="button button-dark" href="/dashboard">Open dashboard →</Link><Link className="button button-ghost" href="/repositories">Choose a repository</Link></div></section></main>;
  return <main className="signin-page"><section className="signin-card"><p className="eyebrow">OPTIONAL ACCOUNT</p><h1>Save your rehearsal progress</h1><p>RepoRehearsal is public and the demo, public GitHub import, and local upload all work without an account. Sign in when you want history, preferences, and repository metadata to follow you between sessions.</p><Link className="provider-button" href={chatGPTSignInPath("/dashboard")}><span className="provider-mark">OA</span><span><b>Continue with ChatGPT</b><small>Secure sign-in is handled by OpenAI</small></span><strong>→</strong></Link><div className="signin-divider"><span>ACCOUNT BOUNDARY</span></div><ul className="signin-benefits"><li>Save scores, duration, and completed rehearsals</li><li>Remember guided, independent, or interview defaults</li><li>Keep metadata for uploaded and public GitHub repositories</li><li>Repository contents and provider passwords are never stored in your profile</li></ul><Link className="text-link" href="/repositories">Continue without an account →</Link></section></main>;
}
