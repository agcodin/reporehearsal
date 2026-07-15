import Link from "next/link";
import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "../chatgpt-auth";

function initials(value: string) { return value.split(/\s+|@/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join(""); }

export default async function AuthNavigation() {
  const user = await getChatGPTUser();
  if (!user) return <Link className="button button-dark button-small" href={chatGPTSignInPath("/dashboard")}>Sign in <span aria-hidden>→</span></Link>;
  return <div className="account-nav"><Link href="/account" className="account-link" aria-label={`Account for ${user.displayName}`}><span className="account-avatar">{initials(user.displayName)}</span><span className="account-nav-copy"><b>{user.displayName}</b><small>View account</small></span></Link><Link className="signout-link" href={chatGPTSignOutPath("/")}>Sign out</Link></div>;
}
