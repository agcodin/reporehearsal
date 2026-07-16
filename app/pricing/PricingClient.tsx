"use client";

import Link from "next/link";
import { plans, type PlanId } from "../../src/billing/plans";
import { usePlan } from "../components/PlanProvider";

export default function PricingClient() {
  const { activePlan, activate, plan: current } = usePlan();

  function choose(plan: PlanId) {
    activate(plan);
    document.getElementById("plan-confirmation")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return <main className="pricing-page">
    <section className="pricing-hero page-pad"><p className="eyebrow">PRICING PREVIEW</p><h1>Practice alone.<br /><em>Build readiness together.</em></h1><p>Payments are not connected yet. Activate any plan now to explore its product experience with no checkout or card details.</p><div id="plan-confirmation" className="preview-access-note"><span className="pulse" /><div><b>{current.name} preview is active</b><small>Your selection is remembered only on this device. Change plans whenever you like.</small></div></div></section>
    <section className="pricing-grid page-pad" aria-label="RepoRehearsal plans">{plans.map(plan => <article className={`pricing-card ${plan.featured ? "featured" : ""} ${activePlan === plan.id ? "active" : ""}`} key={plan.id}><div className="pricing-card-head"><span className="panel-label">{plan.eyebrow}</span>{activePlan === plan.id && <span className="badge badge-green">ACTIVE PREVIEW</span>}</div><h2>{plan.name}</h2><p>{plan.description}</p><div className="plan-price"><strong>{plan.price}</strong><span>{plan.cadence}</span></div><ul>{plan.features.map(feature => <li key={feature}><span>✓</span>{feature}</li>)}</ul><button className={`button ${plan.featured ? "button-blue" : "button-dark"}`} onClick={() => choose(plan.id)}>{activePlan === plan.id ? `${plan.name} is active` : plan.cta}</button><Link className="text-link plan-open-link" href={plan.href}>Open included features →</Link></article>)}</section>
    <section className="pricing-explainer page-pad"><div><p className="eyebrow">THE COMMERCIAL MODEL</p><h2>Pay for depth, persistence, and coordination.</h2></div><div className="pricing-principles"><article><b>Public practice stays public</b><p>The four starter incidents, public GitHub links, and temporary local uploads remain free.</p></article><article><b>Individuals buy better feedback</b><p>Pro adds interview conditions, persistent progress, and a deeper breakdown of investigation skills.</p></article><article><b>Teams buy readiness visibility</b><p>Assignments, reporting, shared programs, and custom incident design create the organizational value.</p></article></div></section>
  </main>;
}
