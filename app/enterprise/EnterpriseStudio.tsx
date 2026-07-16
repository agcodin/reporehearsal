"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { usePlan } from "../components/PlanProvider";

type Draft = { id: string; title: string; signal: string; objective: string };

export default function EnterpriseStudio() {
  const { includes, activate } = usePlan();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [title, setTitle] = useState(""); const [signal, setSignal] = useState(""); const [objective, setObjective] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => { const stored = window.localStorage.getItem("rr-enterprise-drafts"); if (stored) { try { setDrafts(JSON.parse(stored)); } catch { /* ignore malformed device state */ } } }, 0); return () => window.clearTimeout(timer); }, []);
  function submit(event: FormEvent) { event.preventDefault(); if (!title.trim() || !signal.trim() || !objective.trim()) return; const next = [...drafts, { id: crypto.randomUUID(), title: title.trim(), signal: signal.trim(), objective: objective.trim() }]; setDrafts(next); window.localStorage.setItem("rr-enterprise-drafts", JSON.stringify(next)); setTitle(""); setSignal(""); setObjective(""); }

  if (!includes("ENTERPRISE")) return <main className="app-page"><section className="feature-gate"><span className="badge badge-red">ENTERPRISE FEATURE</span><h1>Turn operational history into practice.</h1><p>Activate the Enterprise preview to draft custom incident templates and explore security controls. Billing is not connected.</p><div className="actions"><button className="button button-blue" onClick={() => activate("ENTERPRISE")}>Activate Enterprise preview →</button><Link className="button button-ghost" href="/pricing">Compare plans</Link></div></section></main>;

  return <main className="app-page"><div className="page-title-row"><div><p className="eyebrow">CUSTOM INCIDENT STUDIO</p><h1>Model the failures your teams face</h1><p>Create a safe template draft from a real operational pattern. Drafts remain on this device during the no-billing preview.</p></div><span className="badge badge-green">ENTERPRISE PREVIEW ACTIVE</span></div>
    <div className="enterprise-grid"><form className="panel incident-builder" onSubmit={submit}><span className="panel-label">NEW TEMPLATE DRAFT</span><h2>Incident briefing</h2><label>Incident title<input value={title} onChange={event => setTitle(event.target.value)} placeholder="Checkout API returns stale inventory" required /></label><label>Initial signal<textarea value={signal} onChange={event => setSignal(event.target.value)} placeholder="Error rate rose after a cache configuration rollout" required /></label><label>Training objective<textarea value={objective} onChange={event => setObjective(event.target.value)} placeholder="Diagnose the cache boundary, repair configuration, and verify recovery" required /></label><button className="button button-blue">Save template draft →</button></form>
      <aside><section className="panel enterprise-controls"><span className="panel-label">PROGRAM CONTROLS</span><h2>Enterprise safeguards</h2><div><b>Source retention</b><span>24 hours</span></div><div><b>Outbound network</b><span>Blocked</span></div><div><b>Audit exports</b><span>Enabled</span></div><div><b>Custom execution</b><span>Approval required</span></div></section><section className="panel draft-list"><span className="panel-label">TEMPLATE DRAFTS</span><h2>{drafts.length ? `${drafts.length} saved` : "No drafts yet"}</h2>{drafts.map(draft => <article key={draft.id}><b>{draft.title}</b><p>{draft.signal}</p><small>OBJECTIVE · {draft.objective}</small></article>)}</section></aside></div>
  </main>;
}
