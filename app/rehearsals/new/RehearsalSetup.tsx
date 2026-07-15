"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { incidents } from "../../../src/data";
import type { AccountMode } from "../../../src/accounts/types";

type CasePreset = { difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"; mode: AccountMode; timeLimitMinutes: number };
const presets: Record<string, CasePreset> = {
  "db-required-field-migration-v1": { difficulty: "INTERMEDIATE", mode: "GUIDED", timeLimitMinutes: 25 },
  "container-host-config-v1": { difficulty: "BEGINNER", mode: "GUIDED", timeLimitMinutes: 15 },
  "provider-schema-drift-v1": { difficulty: "INTERMEDIATE", mode: "INDEPENDENT", timeLimitMinutes: 25 },
  "webhook-replay-idempotency-v1": { difficulty: "ADVANCED", mode: "INDEPENDENT", timeLimitMinutes: 45 },
};

export default function RehearsalSetup() {
  const router = useRouter(); const search = useSearchParams(); const repositoryId = search.get("repositoryId") ?? "billing-demo";
  const [incidentId, setIncidentId] = useState(incidents[0].id); const [status, setStatus] = useState<"idle" | "creating" | "error">("idle"); const [message, setMessage] = useState("");
  const selected = incidents.find(item => item.id === incidentId) ?? incidents[0]; const preset = presets[selected.id];
  const repositoryName = repositoryId === "billing-demo" ? "RepoRehearsal Billing Demo" : "Your imported repository";

  async function start(event: FormEvent) {
    event.preventDefault(); setStatus("creating"); setMessage("");
    try {
      const repositoryAccessToken = sessionStorage.getItem(`rr-repository-${repositoryId}`);
      const response = await fetch("/api/rehearsals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repositoryId, repositoryAccessToken, incidentTemplateId: selected.id, ...preset }) });
      const data = await response.json() as { session?: { id: string }; accessToken?: string; error?: { message?: string } };
      if (!response.ok || !data.session || !data.accessToken) throw new Error(data.error?.message ?? "The rehearsal could not be created.");
      sessionStorage.setItem(`rr-session-${data.session.id}`, data.accessToken); router.push(`/rehearsals/${data.session.id}/preparing`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "The rehearsal could not be created."); setStatus("error"); }
  }

  return <main className="app-page"><div className="page-title-row"><div><p className="eyebrow">PRACTICE CASES</p><h1>Pick an incident to solve</h1><p>Each case has a fixed challenge level and time limit—choose one and start. No dropdowns or setup maze.</p></div></div>
    <form onSubmit={start}><div className="scenario-grid">{incidents.map((incident, index) => { const itemPreset = presets[incident.id]; return <button type="button" className={`scenario-card scenario-choice ${incidentId === incident.id ? "selected" : ""}`} key={incident.id} onClick={() => setIncidentId(incident.id)} aria-pressed={incidentId === incident.id}><span className={`badge ${index === 0 || index === 3 ? "badge-red" : "badge-blue"}`}>{itemPreset.difficulty}</span><h2>{incident.name}</h2><p>{incident.summary}</p><div className="tag-row"><span className="tag">{incident.category.replace("_", " ")}</span><span className="tag">{itemPreset.mode.toLowerCase()} · {itemPreset.timeLimitMinutes} min</span></div><b className="scenario-select-label">{incidentId === incident.id ? "✓ Selected" : "Choose this case"}</b></button>; })}</div>
      <section className="panel case-launch"><span className="panel-label">READY TO REHEARSE</span><div><div><h2>{selected.name}</h2><p>{repositoryName} · {preset.mode.toLowerCase()} mode · {preset.timeLimitMinutes} minutes · {preset.difficulty.toLowerCase()}</p></div><button className="button button-blue" disabled={status === "creating"}>{status === "creating" ? "Creating workspace…" : "Start this case →"}</button></div>{message && <div className="import-result import-error" role="alert"><b>Rehearsal not created</b><p>{message}</p></div>}</section>
    </form>
    <section className="panel more-repositories"><span className="panel-label">WANT MORE CASES?</span><h2>Bring your own codebase</h2><p>Paste a public GitHub link or upload a folder/ZIP now. Sign in with ChatGPT if you want to keep reusable source snapshots and rehearsal history.</p><div className="actions"><Link className="button button-dark" href="/repositories">Import a repository →</Link><Link className="button button-ghost" href="/signin">Sign in to save progress</Link></div></section>
  </main>;
}
