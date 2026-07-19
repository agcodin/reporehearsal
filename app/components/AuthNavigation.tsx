import Link from "next/link";
import { getAuthenticatedUser, signOutPath } from "../auth";
import AccountMenu from "./AccountMenu";

function initials(value: string) { return value.split(/\s+|@/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join(""); }

export default async function AuthNavigation() {
  const user = await getAuthenticatedUser();
  if (!user) return <Link className="nav-signin" href="/signin">Sign in</Link>;
  return <AccountMenu displayName={user.displayName} initials={initials(user.displayName)} signOutHref={signOutPath("/")} />;
}
