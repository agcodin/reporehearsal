"use client";
import { FormEvent, useState } from "react";
import type { AccountMode, AccountProfile } from "../../src/accounts/types";

export default function AccountSettings({ profile }: { profile: AccountProfile }) {
  const [mode, setMode] = useState<AccountMode>(profile.defaultMode); const [timeLimit, setTimeLimit] = useState(profile.defaultTimeLimit);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  async function save(event: FormEvent) { event.preventDefault(); setStatus("saving"); const response = await fetch("/api/account/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ defaultMode: mode, defaultTimeLimit: timeLimit }) }); setStatus(response.ok ? "saved" : "error"); }
  return <form className="account-settings" onSubmit={save}><div><label htmlFor="default-mode">Default rehearsal mode</label><select id="default-mode" value={mode} onChange={event => setMode(event.target.value as AccountMode)}><option value="GUIDED">Guided coaching</option><option value="INDEPENDENT">Independent</option><option value="INTERVIEW">Interview mode</option></select><small>Applied when you open the new rehearsal flow.</small></div><div><label htmlFor="default-limit">Default time limit</label><select id="default-limit" value={timeLimit} onChange={event => setTimeLimit(Number(event.target.value))}><option value={15}>15 minutes</option><option value={25}>25 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option></select><small>Interview mode always uses a visible countdown.</small></div><button className="button button-dark" disabled={status === "saving"}>{status === "saving" ? "Saving…" : "Save preferences"}</button><span className={`settings-status ${status}`} aria-live="polite">{status === "saved" ? "Preferences saved." : status === "error" ? "Preferences could not be saved." : ""}</span></form>;
}
