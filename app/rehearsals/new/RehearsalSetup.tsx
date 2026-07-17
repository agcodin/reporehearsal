"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { incidents } from "../../../src/data";
import type { AccountMode } from "../../../src/accounts/types";
import { usePlan } from "../../components/PlanProvider";
import type { IncidentTemplate } from "../../../src/types";

const GENERATED_INCIDENT_ID = "repository-generated-v1";
const generatedIncident: IncidentTemplate = {
  id: GENERATED_INCIDENT_ID, version: 1, name: "Repository-derived incident", category: "external_dependency", difficulty: "intermediate", available: true,
  summary: "Analyze the imported source, select its strongest safe failure boundary, and inject a repairable problem into the isolated session copy.",
  briefing: { title: "Repository-derived incident", severity: "SEV-2", customerReport: "Generated after source analysis.", initialAlert: "Pending incident preparation", knownImpact: [], unaffectedSystems: [] },
  intendedRootCause: "Determined from the selected repository snapshot during preparation.", hints: [],
};

type CasePreset = { difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"; mode: AccountMode; timeLimitMinutes: number };
const presets: Record<string, CasePreset> = {
  "db-required-field-migration-v1": { difficulty: "INTERMEDIATE", mode: "GUIDED", timeLimitMinutes: 25 },
  "container-host-config-v1": { difficulty: "BEGINNER", mode: "GUIDED", timeLimitMinutes: 15 },
  "provider-schema-drift-v1": { difficulty: "INTERMEDIATE", mode: "INDEPENDENT", timeLimitMinutes: 25 },
  "webhook-replay-idempotency-v1": { difficulty: "ADVANCED", mode: "INDEPENDENT", timeLimitMinutes: 45 },
  [GENERATED_INCIDENT_ID]: { difficulty: "INTERMEDIATE", mode: "INDEPENDENT", timeLimitMinutes: 30 },
};

export default function RehearsalSetup() {
  const router = useRouter(); const search = useSearchParams(); const repositoryId = search.get("repositoryId") ?? "billing-demo";
  const isDemo = repositoryId === "billing-demo"; const availableIncidents = isDemo ? incidents : [generatedIncident];
  const [incidentId, setIncidentId] = useState(isDemo ? incidents[0].id : GENERATED_INCIDENT_ID); const [status, setStatus] = useState<"idle" | "creating" | "error">("idle"); const [message, setMessage] = useState("");
  const [interviewMode, setInterviewMode] = useState(false); const { includes, activate, plan } = usePlan();
  const selected = availableIncidents.find(item => item.id === incidentId) ?? availableIncidents[0]; const preset = presets[selected.id];
  const repositoryName = isDemo ? "RepoRehearsal Billing Demo" : "Your imported repository";

  async function start(event: FormEvent) {
    event.preventDefault(); setStatus("creating"); setMessage("");
    try {
      const repositoryAccessToken = sessionStorage.getItem(`rr-repository-${repositoryId}`);
      const response = await fetch("/api/rehearsals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repositoryId, repositoryAccessToken, incidentTemplateId: selected.id, ...preset, mode: interviewMode ? "INTERVIEW" : preset.mode }) });
      const data = await response.json() as { session?: { id: string }; accessToken?: string; error?: { message?: string } };
      if (!response.ok || !data.session || !data.accessToken) throw new Error(data.error?.message ?? "The rehearsal could not be created.");
      sessionStorage.setItem(`rr-session-${data.session.id}`, data.accessToken); router.push(`/rehearsals/${data.session.id}/preparing`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "The rehearsal could not be created."); setStatus("error"); }
  }

  return <main className="app-page"><div className="page-title-row"><div><p className="eyebrow">{isDemo ? "PRACTICE CASES" : "REPOSITORY BRAIN · SOURCE-BOUND"}</p><h1>{isDemo ? "Pick an incident to solve" : "Generate a problem from this repository"}</h1><p>{isDemo ? "Each case has a fixed challenge level and time limit—choose one and start. No dropdowns or setup maze." : "RepoRehearsal will inspect the stored source, choose the highest-confidence repairable boundary, inject one fault into a disposable copy, and preserve the original repository."}</p></div></div>
    <form onSubmit={start}><div className="scenario-grid">{availableIncidents.map((incident, index) => { const itemPreset = presets[incident.id]; return <button type="button" className={`scenario-card scenario-choice ${incidentId === incident.id ? "selected" : ""}`} key={incident.id} onClick={() => setIncidentId(incident.id)} aria-pressed={incidentId === incident.id}><span className={`badge ${index === 0 || index === 3 ? "badge-red" : "badge-blue"}`}>{itemPreset.difficulty}</span><h2>{incident.name}</h2><p>{incident.summary}</p><div className="tag-row"><span className="tag">{isDemo ? incident.category.replace("_", " ") : "actual source mutation"}</span><span className="tag">{itemPreset.mode.toLowerCase()} · {itemPreset.timeLimitMinutes} min</span></div><b className="scenario-select-label">{incidentId === incident.id ? "✓ Selected" : "Choose this case"}</b></button>; })}</div>
      <section className="panel pro-mode-card"><div><span className="panel-label">PRO PRACTICE CONTROL</span><h2>Interview conditions</h2><p>Disable coaching hints and score the investigation for evidence use, verification, and communication.</p></div>{includes("PRO") ? <button type="button" className={`mode-toggle ${interviewMode ? "active" : ""}`} onClick={() => setInterviewMode(value => !value)} aria-pressed={interviewMode}><span>{interviewMode ? "ON" : "OFF"}</span><b>{interviewMode ? "Interview mode enabled" : "Use standard mode"}</b></button> : <button type="button" className="button button-dark" onClick={() => activate("PRO")}>Activate Pro preview →</button>}</section>
      <section className="panel case-launch"><span className="panel-label">READY TO REHEARSE · {plan.name.toUpperCase()} PREVIEW</span><div><div><h2>{selected.name}</h2><p>{repositoryName} · {(interviewMode ? "interview" : preset.mode.toLowerCase())} mode · {preset.timeLimitMinutes} minutes · {preset.difficulty.toLowerCase()}</p></div><button className="button button-blue" disabled={status === "creating"}>{status === "creating" ? "Creating workspace…" : "Start this case →"}</button></div>{message && <div className="import-result import-error" role="alert"><b>Rehearsal not created</b><p>{message}</p></div>}</section>
    </form>
    <section className="panel more-repositories"><span className="panel-label">WANT MORE CASES?</span><h2>Bring your own codebase</h2><p>Sign in to paste a public GitHub link, choose from your connected GitHub repositories, or upload a folder or ZIP.</p><div className="actions"><Link className="button button-dark" href="/repositories">Import a repository →</Link><Link className="button button-ghost" href="/signin">Sign in to import</Link></div></section>
  </main>;
}
