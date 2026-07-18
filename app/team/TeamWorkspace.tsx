"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePlan } from "../components/PlanProvider";

type Assignment = { id: string; name: string; track: string; target: string };
const catalog = [
  { name: "Safe database rollouts", track: "Database reliability", target: "Required field migration" },
  { name: "Service boundary diagnosis", track: "Distributed systems", target: "Container host mismatch" },
  { name: "Third-party resilience", track: "Provider reliability", target: "Provider schema drift" },
];

export default function TeamWorkspace() {
  const { includes, activate } = usePlan();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem("rr-team-assignments");
      if (stored) { try { setAssignments(JSON.parse(stored)); } catch { /* ignore malformed device state */ } }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  function add(item: typeof catalog[number]) {
    const next = [...assignments, { ...item, id: crypto.randomUUID() }];
    setAssignments(next); window.localStorage.setItem("rr-team-assignments", JSON.stringify(next));
  }

  if (!includes("TEAM")) return <main className="app-page"><section className="feature-gate"><span className="badge badge-blue">TEAM FEATURE</span><h1>Turn practice into a readiness program.</h1><p>Activate the Team preview to create learning-path assignments and open the manager dashboard. Billing is not connected.</p><div className="actions"><button className="button button-blue" onClick={() => activate("TEAM")}>Activate Team preview →</button><Link className="button button-ghost" href="/pricing">Compare plans</Link></div></section></main>;

  return <main className="app-page product-dashboard"><div className="page-title-row product-intro"><div><p className="eyebrow">TEAM READINESS</p><h1>Reliability practice program</h1><p>Create assignments now. Member invitations and billing will connect after the preview period.</p></div><span className="badge badge-green">TEAM PREVIEW ACTIVE</span></div>
    <section className="grid-4"><div className="stat-card"><small>ASSIGNMENTS</small><strong>{assignments.length}</strong><span className="delta">Created on this device</span></div><div className="stat-card"><small>AVAILABLE CASES</small><strong>4</strong><span className="delta">Across 3 categories</span></div><div className="stat-card"><small>TEAM MEMBERS</small><strong>—</strong><span className="delta">Connect after billing</span></div><div className="stat-card"><small>READINESS SCORE</small><strong>—</strong><span className="delta">Begins after submissions</span></div></section>
    <div className="team-grid"><section className="panel"><span className="panel-label">ACTIVE ASSIGNMENTS</span><h2>Your learning paths</h2>{ready && assignments.length ? assignments.map(item => <div className="assignment-row" key={item.id}><span className="repo-source-mark compact">LP</span><div><b>{item.name}</b><p>{item.track} · {item.target}</p></div><span>READY</span></div>) : <div className="empty-state"><span className="step-icon">01</span><h3>No assignments yet</h3><p>Add a learning path from the catalog. It will be ready to assign when team membership is connected.</p></div>}</section>
      <aside className="panel assignment-catalog"><span className="panel-label">LEARNING-PATH CATALOG</span><h2>Assign focused practice</h2>{catalog.map(item => <article key={item.name}><div><b>{item.name}</b><p>{item.track}<br />Starts with {item.target}</p></div><button className="button button-ghost button-small" onClick={() => add(item)}>Add path</button></article>)}<Link className="button button-dark" href="/team/studio">Open custom incident studio</Link></aside></div>
  </main>;
}
