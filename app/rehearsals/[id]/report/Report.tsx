"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePlan } from "../../../components/PlanProvider";
import { lineDiff, diffStats } from "../../../../src/rehearsals/diff";

type Check = { name: string; status: "passed" | "failed"; hidden?: boolean; detail: string };
type Breakdown = { label: string; earned: number; possible: number; signals?: string[] };
type Validation = { score: number; passed: boolean; checks: Check[]; breakdown: Breakdown[] };
type Diff = { path: string; before: string; after: string };
type ReportData = { title: string; rootCause: string; summary: string; evidenceUsed: string[]; missedEvidence: string[]; prevention: string[]; score: number; passed: boolean; markdown: string; aiEnhanced: boolean; diff?: Diff | null };

function DiffView({ diff }: { diff: Diff }) {
  const rows = lineDiff(diff.before, diff.after);
  const { added, removed } = diffStats(rows);
  if (added === 0 && removed === 0) return <section className="report-section"><h2>Your change</h2><p>No changes were submitted, so the incident was left in place.</p></section>;
  return <section className="report-section"><h2>Your change</h2><p className="diff-meta"><code>{diff.path}</code> <span className="diff-added">+{added}</span> <span className="diff-removed">−{removed}</span></p><div className="diff-view">{rows.map((row, index) => <div className={`diff-row diff-${row.kind}`} key={index}><span className="diff-gutter">{row.kind === "add" ? "+" : row.kind === "remove" ? "−" : " "}</span><code>{row.text || " "}</code></div>)}</div></section>;
}

function collapsedEvidence(items: string[]) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts].map(([label, count]) => ({ label, count }));
}

function practiceFor(label: string) {
  if (label === "Diagnosis") return "State one falsifiable root-cause hypothesis and tie it to the observed failure before editing.";
  if (label === "Investigation") return "Open the failing boundary, inspect the runtime evidence, and record why each signal supports or rejects your hypothesis.";
  if (label === "Fix quality") return "Make the narrowest behavioral repair, then review the diff for shortcuts, unrelated changes, and new failure modes.";
  if (label === "Verification") return "Run the focused test first, then the full test and build checks, and confirm the original customer-facing signal is healthy.";
  if (label === "Prevention") return "Add a regression check that fails on the original defect and document the guardrail that prevents recurrence.";
  return "Write a brief handoff covering impact, evidence, root cause, repair, verification, and remaining risk.";
}

export default function Report({ sessionId }: { sessionId: string }) {
  const { includes, activate } = usePlan();
  const [report, setReport] = useState<ReportData | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [error, setError] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [daily, setDaily] = useState(false);
  const [reroll, setReroll] = useState<{ repositoryId: string } | null>(null);
  const [dailyCounted, setDailyCounted] = useState<boolean | null>(null);
  const [dailyEligible, setDailyEligible] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [verifiedPath, setVerifiedPath] = useState("");
  const [manualShareUrl, setManualShareUrl] = useState("");
  const token = typeof window === "undefined" ? "" : sessionStorage.getItem(`rr-session-${sessionId}`) ?? "";

  useEffect(() => {
    let active = true;
    fetch(`/api/rehearsals/${sessionId}/report`, { headers: token ? { "x-rehearsal-access": token } : {} }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "The report is not ready.");
      if (active) { setReport(data.report); setValidation(data.validation); setDurationSeconds(data.durationSeconds ?? 0); setDaily(Boolean(data.daily)); setDailyCounted(data.dailyLeaderboard?.counted ?? null); setDailyEligible(Boolean(data.dailyLeaderboard?.eligible)); setReroll(data.canReroll && data.repositoryId ? { repositoryId: data.repositoryId } : null); }
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "The report could not be loaded."); });
    return () => { active = false; };
  }, [sessionId, token]);

  function download() {
    if (!report) return;
    const anchor = document.createElement("a");
    const href = URL.createObjectURL(new Blob([report.markdown], { type: "text/markdown" }));
    anchor.href = href; anchor.download = `reporehearsal-${sessionId}.md`; anchor.click(); URL.revokeObjectURL(href);
  }

  async function shareResult() {
    if (!report) return;
    const minutes = Math.floor(durationSeconds / 60); const seconds = durationSeconds % 60;
    const text = `${daily ? "Challenge of the Day" : "RepoRehearsal"}: ${report.score}/100 in ${minutes}:${String(seconds).padStart(2, "0")}. Think you can beat it?`;const resultUrl=verifiedPath?new URL(verifiedPath,window.location.origin).toString():window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: "My RepoRehearsal result", text, url: resultUrl }); setShareStatus("Shared"); return; }
      await navigator.clipboard.writeText(`${text} ${resultUrl}`); setShareStatus("Result link copied");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") { setShareStatus("Sharing cancelled"); return; }
      try { await navigator.clipboard.writeText(`${text} ${resultUrl}`); setShareStatus("Sharing was unavailable, so the link was copied instead"); }
      catch { setManualShareUrl(resultUrl); setShareStatus("Automatic copy is unavailable. Use the link below."); }
    }
  }

  async function publishVerifiedResult(){setShareStatus("Publishing verified result…");setManualShareUrl("");try{const response=await fetch(`/api/rehearsals/${sessionId}/publish`,{method:"POST",headers:token?{"x-rehearsal-access":token}:{}});const data=await response.json() as{verifyPath?:string;error?:{message?:string}};if(!response.ok||!data.verifyPath)throw new Error("publish-failed");setVerifiedPath(data.verifyPath);const url=new URL(data.verifyPath,window.location.origin).toString();try{await navigator.clipboard.writeText(url);setShareStatus("Verified result published and copied");}catch{setManualShareUrl(url);setShareStatus("Verified result published. Automatic copy is unavailable; use the link below.");}}catch{setShareStatus("The verified result could not be published. Please try again.")}}

  if (!report || !validation) return error ? <main className="not-found-page"><div><p className="not-found-code">REPORT</p><h1>Rehearsal not found</h1><p>{error}</p><div className="actions"><Link className="button button-dark" href="/dashboard">Return to dashboard</Link><Link className="button button-ghost" href="/rehearsals/new">Start another rehearsal</Link></div></div></main> : <main className="app-page"><p className="eyebrow">AFTER-ACTION REPORT</p><h1>Generating your verified report…</h1></main>;

    const evidenceItems = collapsedEvidence(report.evidenceUsed); const resultMessage = report.score < 0 ? "Well, the bug has friends now. This submission made the incident worse, so the score went below zero." : report.score === 0 ? "No edit, no points. The incident remained exactly where it started." : report.summary;
    const skillSignals = validation.breakdown.map(item => ({ ...item, percent: item.possible > 0 ? Math.max(0, Math.round(item.earned / item.possible * 100)) : 0 }));
    const rankedSkills = [...skillSignals].sort((a, b) => a.percent - b.percent);
    const prioritySkill = rankedSkills[0];
    const strongestSkill = rankedSkills[rankedSkills.length - 1];
    return <main className={daily ? "daily-report-page" : ""}>{daily && <div className="daily-report-identity"><b>Challenge of the Day</b><span>{dailyCounted ? "First result counted on today’s leaderboard" : dailyEligible ? "Practice replay · ranked result unchanged" : "Guest result · sign in before playing to rank"}</span><Link href="/daily">View today’s leaderboard</Link></div>}<section className={`report-hero ${report.passed ? "report-passed" : "report-failed"}`}><div className="report-inner"><span className="report-kicker">{daily ? "DAILY CHALLENGE COMPLETE" : "REHEARSAL COMPLETE"} · {report.passed ? "INCIDENT RESOLVED" : "REPAIR INCOMPLETE"}</span><div className="score-layout"><div className="report-score-block"><div className="big-score"><strong>{report.score}</strong><span>/100</span></div><span className={`badge ${report.passed ? "badge-green" : "badge-red"}`}>{report.passed ? "VALIDATED REPAIR" : "NEEDS REVISION"}</span></div><div><h1>{report.title}</h1><p>{resultMessage}</p><p><small>The score is calculated from the submitted workspace, repository baseline contracts, evidence viewed, hypotheses recorded, verification commands, test changes, and hint usage.</small></p>{report.aiEnhanced && <p><small>Communication feedback enhanced with the configured OpenAI model; validation and score remain deterministic.</small></p>}<div className="breakdown">{validation.breakdown.map(item => <div key={item.label}><small>{item.label.toUpperCase()}</small><b>{item.earned}/{item.possible}</b></div>)}</div></div></div></div></section>
    <div className="report-body"><div>{report.diff && <DiffView diff={report.diff} />}<section className="report-section"><h2>Root cause</h2><p>{report.rootCause}</p><div className="callout"><b>Outcome</b><p>{report.passed ? "The submitted workspace passed every required deterministic check." : "One or more required checks failed. Reopen a new rehearsal and repair the underlying cause."}</p></div></section>
      <section className="report-section"><h2>Deterministic validation</h2>{validation.checks.map(check => <div className="check-row" key={check.name}><span>{check.status === "passed" ? "✓" : "×"}</span><div><b>{check.name} {check.hidden && <small>· HIDDEN</small>}</b><p>{check.detail}</p></div></div>)}</section>
      <section className="report-section"><h2>Prevention measures</h2><ol>{report.prevention.map(item => <li key={item}>{item}</li>)}</ol></section></div>
      <aside><section className="report-section"><h2>Investigation review</h2>{report.score === 0 && evidenceItems.length > 0 && <p className="evidence-zero-note">Evidence was recorded, but it does not count toward the score because no repair was submitted.</p>}<p><b>Evidence used</b></p>{evidenceItems.length ? <ul>{evidenceItems.map(item => <li key={item.label}>{item.label}{item.count > 1 && <span className="evidence-count"> ×{item.count}</span>}</li>)}</ul> : <p>No investigation evidence was recorded.</p>}<p><b>Missed evidence</b></p>{report.missedEvidence.length ? <ul>{report.missedEvidence.map(item => <li key={item}>{item}</li>)}</ul> : <p>No material evidence gaps identified.</p>}</section>{includes("PRO") ? <section className="report-section advanced-report"><span className="badge badge-blue">PRO ANALYSIS</span><h2>Skill analysis</h2><p className="skill-method">Rubric attainment for this attempt—not a comparison with other users.</p>{skillSignals.map(item => <div className="report-skill" key={item.label}><div><b>{item.label}</b><span>{item.percent}% · {item.earned}/{item.possible}</span></div><div className="skill-bar"><span style={{ width: `${item.percent}%` }} /></div></div>)}<div className="pro-signal-summary"><div><b>Strongest signal</b><p>{strongestSkill.label} at {strongestSkill.percent}%. {strongestSkill.signals?.[0] ?? "This category contributed the most complete evidence in the attempt."}</p></div><div><b>Highest-priority gap</b><p>{prioritySkill.label} at {prioritySkill.percent}%. {prioritySkill.signals?.find(signal => /miss|not|without|fail|no /i.test(signal)) ?? practiceFor(prioritySkill.label)}</p></div></div><div className="pro-action-plan"><b>Next-attempt plan</b><ol><li>{practiceFor(prioritySkill.label)}</li>{report.missedEvidence[0] && <li>Close this evidence gap: {report.missedEvidence[0]}</li>}<li>{report.passed ? "Repeat in Interview mode without coaching and preserve the same validation quality." : "Re-run the incident and do not submit until every required deterministic check passes."}</li></ol></div></section> : <section className="report-section advanced-report locked"><span className="badge badge-blue">PRO ANALYSIS</span><h2>See the skill behind the score</h2><p>Activate the Pro preview for category attainment, observed strengths and gaps, and a next-attempt practice plan. No payment details required.</p><button className="button button-blue" onClick={() => activate("PRO")}>Activate Pro preview →</button></section>}<section className="report-section"><h2>Recommended next</h2><p>Run another incident category or repeat this scenario without coaching to strengthen independent diagnosis.</p>{reroll&&<Link className="button button-blue" href={`/rehearsals/new?repositoryId=${encodeURIComponent(reroll.repositoryId)}&generated=1`} style={{marginBottom:12}}>Practice a different fault in this repo →</Link>}<Link className="button button-dark" href="/rehearsals/new">Choose next exercise →</Link></section><button className="button button-ghost" style={{ width: "100%" }} onClick={download}>Export Markdown ↓</button></aside>
    </div>
    <section className="grading-detail"><h2>How this submission was graded</h2><p>Every category comes from observable work in this rehearsal—there is no participation-score floor.</p><div>{validation.breakdown.map(item => <article key={item.label}><b>{item.label}</b><strong>{item.earned}/{item.possible}</strong><p>{item.label === "Diagnosis" ? "Root-cause hypotheses and whether they matched the failure contract." : item.label === "Investigation" ? "Files opened, logs and state inspected, and evidence gathered before editing." : item.label === "Fix quality" ? "Whether behavior was repaired without unsafe shortcuts or collateral damage." : item.label === "Verification" ? "Tests, build, lint, restart, and health checks run after the change." : item.label === "Prevention" ? "Regression coverage and safeguards that reduce recurrence." : "How clearly the evidence and reasoning were recorded."}</p>{item.signals?.length ? <ul className="grading-signals">{item.signals.map(signal => <li key={signal}>{signal}</li>)}</ul> : null}</article>)}</div></section>
    <section className="share-result-bar" aria-label="Share result"><div><b>{daily ? "Challenge of the Day" : "Rehearsal result"}</b><span>{report.score}/100 · {Math.floor(durationSeconds / 60)}:{String(durationSeconds % 60).padStart(2, "0")}</span></div>{verifiedPath?<Link className="button button-ghost" href={verifiedPath}>Open verified result</Link>:<button className="button button-ghost" onClick={publishVerifiedResult}>Create verified result</button>}<button className="button button-dark" onClick={shareResult}>Share score and time</button>{shareStatus && <span role="status">{shareStatus}</span>}{manualShareUrl&&<label className="manual-share-link">Share link<input value={manualShareUrl} readOnly onFocus={event=>event.currentTarget.select()}/></label>}</section>
  </main>;
}
