"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AccountMode } from "../../../src/accounts/types";
import type { BillingCadence, PlanId } from "../../../src/billing/plans";
import { onboardingPath } from "../shared";

const modes: { id: AccountMode; title: string; copy: string }[] = [
  { id: "GUIDED", title: "Guided", copy: "Hints and investigation prompts are available when you need them." },
  { id: "INDEPENDENT", title: "Independent", copy: "Work the incident without coaching, then review the full report." },
  { id: "INTERVIEW", title: "Interview", copy: "Timed practice with hints disabled and communication scoring." },
];

export default function PreferencesStep({ plan, billing }: { plan: PlanId; billing: BillingCadence }) {
  const router = useRouter(); const [mode, setMode] = useState<AccountMode>("GUIDED"); const [minutes, setMinutes] = useState(25); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function continueToPlans() {
    setSaving(true); setError("");
    try { const response = await fetch("/api/account/preferences", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ defaultMode: mode, defaultTimeLimit: minutes }) }); if (!response.ok) throw new Error("Preferences could not be saved."); router.push(onboardingPath("plan", plan, billing)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Preferences could not be saved."); setSaving(false); }
  }
  return <section className="onboarding-panel"><p className="eyebrow">PRACTICE PREFERENCES</p><h1>Choose your default rehearsal style.</h1><p>You can change both settings before any rehearsal starts.</p>
    <fieldset className="preference-options"><legend>Default mode</legend>{modes.map(option => <button type="button" className={mode === option.id ? "selected" : ""} aria-pressed={mode === option.id} onClick={() => setMode(option.id)} key={option.id}><b>{option.title}</b><span>{option.copy}</span></button>)}</fieldset>
    <label className="time-preference">Default time limit<select value={minutes} onChange={event => setMinutes(Number(event.target.value))}><option value={15}>15 minutes</option><option value={25}>25 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option></select><small>The timer is a practice aid. Your work is not deleted when it expires.</small></label>
    {error && <p className="onboarding-error" role="alert">{error}</p>}
    <div className="onboarding-actions"><button className="button button-dark" disabled={saving} onClick={continueToPlans}>{saving ? "Saving…" : "Save and review plans →"}</button><button className="text-link" onClick={() => router.back()}>Back</button></div>
  </section>;
}
