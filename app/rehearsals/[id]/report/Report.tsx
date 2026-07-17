"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePlan } from "../../../components/PlanProvider";

type Check = { name: string; status: "passed" | "failed"; hidden?: boolean; detail: string };
type Breakdown = { label: string; earned: number; possible: number };
type Validation = { score: number; passed: boolean; checks: Check[]; breakdown: Breakdown[] };
type ReportData = { title: string; rootCause: string; summary: string; evidenceUsed: string[]; missedEvidence: string[]; prevention: string[]; score: number; passed: boolean; markdown: string; aiEnhanced: boolean };

function collapsedEvidence(items: string[]) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts].map(([label, count]) => ({ label, count }));
}

export default function Report({ sessionId }: { sessionId: string }) {
  const { includes, activate } = usePlan();
  const [report, setReport] = useState<ReportData | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [error, setError] = useState("");
  const token = typeof window === "undefined" ? "" : sessionStorage.getItem(`rr-session-${sessionId}`) ?? "";

  useEffect(() => {
    let active = true;
    fetch(`/api/rehearsals/${sessionId}/report`, { headers: token ? { "x-rehearsal-access": token } : {} }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "The report is not ready.");
      if (active) { setReport(data.report); setValidation(data.validation); }
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "The report could not be loaded."); });
    return () => { active = false; };
  }, [sessionId, token]);

  function download() {
    if (!report) return;
    const anchor = document.createElement("a");
    const href = URL.createObjectURL(new Blob([report.markdown], { type: "text/markdown" }));
    anchor.href = href; anchor.download = `reporehearsal-${sessionId}.md`; anchor.click(); URL.revokeObjectURL(href);
  }

  if (!report || !validation) return <main className="app-page"><p className="eyebrow">AFTER-ACTION REPORT</p><h1>{error || "Generating your verified report…"}</h1>{error && <Link className="button button-dark" href={`/rehearsals/${sessionId}/workspace`}>Return to workspace</Link>}</main>;

    const evidenceItems = collapsedEvidence(report.evidenceUsed);
    return <main><section className="report-hero"><div className="report-inner"><span className="report-kicker">REHEARSAL COMPLETE · {report.passed ? "INCIDENT RESOLVED" : "REPAIR INCOMPLETE"}</span><div className="score-layout"><div><div className="big-score"><strong>{report.score}</strong><span>/100</span></div><span className={`badge ${report.passed ? "badge-green" : "badge-red"}`}>{report.passed ? "VALIDATED REPAIR" : "NEEDS REVISION"}</span></div><div><h1>{report.title}</h1><p>{report.summary}</p><p><small>The score is calculated from the submitted workspace, repository baseline contracts, evidence viewed, hypotheses recorded, verification commands, test changes, and hint usage.</small></p>{report.aiEnhanced && <p><small>Communication feedback enhanced with the configured OpenAI model; validation and score remain deterministic.</small></p>}<div className="breakdown">{validation.breakdown.map(item => <div key={item.label}><small>{item.label.toUpperCase()}</small><b>{item.earned}/{item.possible}</b></div>)}</div></div></div></div></section>
    <div className="report-body"><div><section className="report-section"><h2>Root cause</h2><p>{report.rootCause}</p><div className="callout"><b>Outcome</b><p>{report.passed ? "The submitted workspace passed every required deterministic check." : "One or more required checks failed. Reopen a new rehearsal and repair the underlying cause."}</p></div></section>
      <section className="report-section"><h2>Deterministic validation</h2>{validation.checks.map(check => <div className="check-row" key={check.name}><span>{check.status === "passed" ? "✓" : "×"}</span><div><b>{check.name} {check.hidden && <small>· HIDDEN</small>}</b><p>{check.detail}</p></div></div>)}</section>
      <section className="report-section"><h2>Prevention measures</h2><ol>{report.prevention.map(item => <li key={item}>{item}</li>)}</ol></section></div>
      <aside><section className="report-section"><h2>Investigation review</h2><p><b>Evidence used</b></p>{evidenceItems.length ? <ul>{evidenceItems.map(item => <li key={item.label}>{item.label}{item.count > 1 && <span className="evidence-count"> ×{item.count}</span>}</li>)}</ul> : <p>No investigation evidence was recorded.</p>}<p><b>Missed evidence</b></p>{report.missedEvidence.length ? <ul>{report.missedEvidence.map(item => <li key={item}>{item}</li>)}</ul> : <p>No material evidence gaps identified.</p>}</section>{includes("PRO") ? <section className="report-section advanced-report"><span className="badge badge-blue">PRO ANALYSIS</span><h2>Skill signal</h2>{validation.breakdown.map(item => { const percent = Math.round(item.earned / item.possible * 100); return <div className="report-skill" key={item.label}><div><b>{item.label}</b><span>{percent}%</span></div><div className="skill-bar"><span style={{ width: `${percent}%` }} /></div></div>; })}<p><b>Coaching focus</b><br />{report.missedEvidence.length ? "Build the evidence trail before editing, then verify the repair against the original customer impact." : "Your evidence trail was complete. Repeat under interview conditions to test independent communication."}</p></section> : <section className="report-section advanced-report locked"><span className="badge badge-blue">PRO ANALYSIS</span><h2>See the skill behind the score</h2><p>Activate the Pro preview for detailed skill signals and coaching focus. No payment details required.</p><button className="button button-blue" onClick={() => activate("PRO")}>Activate Pro preview →</button></section>}<section className="report-section"><h2>Recommended next</h2><p>Run another incident category or repeat this scenario without coaching to strengthen independent diagnosis.</p><Link className="button button-dark" href="/rehearsals/new">Choose next exercise →</Link></section><button className="button button-ghost" style={{ width: "100%" }} onClick={download}>Export Markdown ↓</button></aside>
    </div>
  </main>;
}
