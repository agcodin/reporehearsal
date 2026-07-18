"use client";

import { useState } from "react";
import { plans, type PlanId } from "../../src/billing/plans";
import { usePlan } from "../components/PlanProvider";

const featureRows: { group: string; label: string; detail: string; included: Record<PlanId, boolean | string> }[] = [
  { group: "PRACTICE", label: "Four starter incidents", detail: "Database, configuration, provider drift, and webhook replay cases", included: { FREE: true, PRO: true, TEAM: true } },
  { group: "PRACTICE", label: "Repository of the day", detail: "The same five-file challenge, prompt, and scoring contract for everyone each day", included: { FREE: true, PRO: true, TEAM: true } },
  { group: "PRACTICE", label: "Repository imports", detail: "Analyze public GitHub repositories, folders, and ZIP archives after sign-in", included: { FREE: "20 MB", PRO: "75 MB", TEAM: "Unlimited" } },
  { group: "PRACTICE", label: "Curated repository roulette", detail: "Choose or randomly draw from 110 vetted public projects", included: { FREE: false, PRO: true, TEAM: true } },
  { group: "PRACTICE", label: "Language-aware incidents", detail: "Repository-specific issues across major application languages", included: { FREE: true, PRO: true, TEAM: true } },
  { group: "REPORTING", label: "Deterministic grading", detail: "Zero for untouched submissions and negative scores for regressions", included: { FREE: true, PRO: true, TEAM: true } },
  { group: "REPORTING", label: "Advanced grading report", detail: "Category rationale, evidence gaps, validation, and prevention", included: { FREE: false, PRO: true, TEAM: true } },
  { group: "PERSONAL", label: "Interview mode", detail: "Timed practice with hints disabled and communication scoring", included: { FREE: false, PRO: true, TEAM: true } },
  { group: "PERSONAL", label: "Saved progress and repository library", detail: "Keep reports, preferences, results, and safe source snapshots", included: { FREE: false, PRO: true, TEAM: true } },
  { group: "TEAM", label: "Team readiness and assignments", detail: "Manage learning paths, reporting, shared programs, and recurring skill gaps", included: { FREE: false, PRO: false, TEAM: true } },
  { group: "TEAM", label: "Custom incident studio", detail: "Turn operational patterns into controlled training templates", included: { FREE: false, PRO: false, TEAM: true } },
  { group: "TEAM", label: "Security, retention, and audit controls", detail: "Configure safeguards and export program activity for review", included: { FREE: false, PRO: false, TEAM: true } },
];

function DashboardMock({ plan }: { plan: PlanId }) {
  if (plan === "FREE") return <div className="mock-dashboard mock-free"><div className="mock-topline"><div><span>FREE PRACTICE</span><h3>Choose your next incident</h3></div><b>4 CASES</b></div><div className="mock-case-grid"><article><span>DB</span><b>Required field migration</b><small>INTERMEDIATE · 25 MIN</small></article><article><span>CFG</span><b>Container host mismatch</b><small>BEGINNER · 15 MIN</small></article><article><span>API</span><b>Provider schema drift</b><small>INTERMEDIATE · 25 MIN</small></article><article><span>PAY</span><b>Webhook replay</b><small>ADVANCED · 45 MIN</small></article></div></div>;
  if (plan === "PRO") return <div className="mock-dashboard mock-pro"><div className="mock-topline"><div><span>PERSONAL READINESS</span><h3>Your investigation profile</h3></div><b>75 MB CAP</b></div><div className="mock-metrics"><article><small>COMPLETED</small><strong>12</strong><i>+3 this month</i></article><article><small>AVG. DIAGNOSIS</small><strong>18m</strong><i>4m faster</i></article><article><small>TOP SKILL</small><strong>91%</strong><i>Diagnosis</i></article></div><div className="mock-chart"><div><span>Diagnosis</span><i style={{ width: "91%" }} /></div><div><span>Evidence</span><i style={{ width: "86%" }} /></div><div><span>Verification</span><i style={{ width: "79%" }} /></div><div><span>Prevention</span><i style={{ width: "64%" }} /></div></div></div>;
  return <div className="mock-dashboard mock-team"><div className="mock-topline"><div><span>TEAM READINESS</span><h3>Complete reliability program</h3></div><b>UNLIMITED</b></div><div className="mock-metrics"><article><small>COMPLETION</small><strong>78%</strong><i>42 rehearsals</i></article><article><small>CUSTOM CASES</small><strong>24</strong><i>6 internal patterns</i></article><article><small>AUDIT STATUS</small><strong>READY</strong><i>Export enabled</i></article></div><div className="mock-team-row"><b>Safe database rollouts</b><span><i style={{ width: "72%" }} /></span><small>13 / 18</small></div><div className="mock-team-row"><b>Provider resilience</b><span><i style={{ width: "44%" }} /></span><small>8 / 18</small></div></div>;
}

export default function PricingClient() {
  const { activePlan, activate, plan: current } = usePlan();
  const [exploredPlan, setExploredPlan] = useState<PlanId>("FREE");

  function choose(plan: PlanId) {
    activate(plan);
    document.getElementById("plan-confirmation")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function explore(plan: PlanId) {
    setExploredPlan(plan);
    window.requestAnimationFrame(() => document.getElementById("feature-breakdown")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return <main className="pricing-page">
    <section className="pricing-hero page-pad"><h1>Plans for individual and team practice</h1><p>Payments are not connected yet. Activate any plan to try its features without checkout or card details.</p><div id="plan-confirmation" className="preview-access-note"><div><b>{current.name} preview is active</b><small>Your selection is saved on this device. Change plans whenever you like.</small></div></div></section>
    <section className="pricing-grid page-pad" aria-label="RepoRehearsal plans">{plans.map(plan => <article className={`pricing-card ${plan.featured ? "featured" : ""} ${activePlan === plan.id ? "active" : ""}`} key={plan.id}><div className="pricing-card-head"><span className="panel-label">{plan.eyebrow}</span>{activePlan === plan.id && <span className="badge badge-green">ACTIVE PREVIEW</span>}</div><h2>{plan.name}</h2><p>{plan.description}</p><div className="plan-price"><strong>{plan.price}</strong><span>{plan.cadence}</span></div><ul>{plan.features.map(feature => <li key={feature}><span>✓</span>{feature}</li>)}</ul><button className={`button ${plan.featured ? "button-blue" : "button-dark"}`} onClick={() => choose(plan.id)}>{activePlan === plan.id ? `${plan.name} is active` : plan.cta}</button><button className="text-link plan-open-link" onClick={() => explore(plan.id)}>Open included features →</button></article>)}</section>
    <section className="feature-breakdown page-pad" id="feature-breakdown"><div className="feature-breakdown-head"><div><h2>Compare plans</h2><p>Checks are included features. Dashes indicate that the feature starts at a higher tier.</p></div><div className="feature-plan-tabs" aria-label="Select dashboard preview">{plans.map(plan => <button className={exploredPlan === plan.id ? "active" : ""} onClick={() => setExploredPlan(plan.id)} aria-pressed={exploredPlan === plan.id} key={plan.id}>{plan.name}</button>)}</div></div><div className="feature-table-scroll"><table className="feature-table"><thead><tr><th scope="col">Capability</th>{plans.map(plan => <th scope="col" className={exploredPlan === plan.id ? "selected" : ""} key={plan.id}><button onClick={() => setExploredPlan(plan.id)}>{plan.name}<small>{plan.price}</small></button></th>)}</tr></thead><tbody>{featureRows.map((feature, index) => <tr key={feature.label} className={index === 0 || featureRows[index - 1].group !== feature.group ? "group-start" : ""}><th scope="row"><small>{feature.group}</small><b>{feature.label}</b><span>{feature.detail}</span></th>{plans.map(plan => <td className={exploredPlan === plan.id ? "selected" : ""} key={plan.id}>{typeof feature.included[plan.id] === "string" ? <span className="feature-value">{feature.included[plan.id]}</span> : feature.included[plan.id] ? <span className="feature-check" aria-label={`${feature.label} is included in ${plan.name}`}>✓</span> : <span className="feature-dash" aria-label={`${feature.label} is not included in ${plan.name}`}>—</span>}</td>)}</tr>)}</tbody></table></div>
      <div className="dashboard-preview"><div className="dashboard-preview-copy"><span className="badge badge-blue">SAMPLE DASHBOARD</span><p className="eyebrow">{plans.find(plan => plan.id === exploredPlan)?.name.toUpperCase()} EXPERIENCE</p><h2>{exploredPlan === "FREE" ? "Start with realistic practice." : exploredPlan === "PRO" ? "Turn repetitions into personal readiness." : "Manage a measurable learning program."}</h2><p>This compact preview shows the primary dashboard available at this tier. Preview values are illustrative.</p><button className="button button-blue" onClick={() => choose(exploredPlan)}>Activate {plans.find(plan => plan.id === exploredPlan)?.name} preview →</button></div><DashboardMock plan={exploredPlan} /></div>
    </section>
    <section className="pricing-explainer page-pad"><div><h2>How plans differ</h2></div><div className="pricing-principles"><article><b>Free practice</b><p>The four starter incidents, public GitHub links, and temporary local uploads remain free.</p></article><article><b>Individual progress</b><p>Pro adds interview conditions, saved progress, and a deeper breakdown of investigation skills.</p></article><article><b>Team readiness</b><p>Assignments, reporting, shared programs, and custom incidents support organization-wide training.</p></article></div></section>
  </main>;
}
