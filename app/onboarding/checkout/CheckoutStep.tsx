"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BillingCadence, Plan } from "../../../src/billing/plans";
import { usePlan } from "../../components/PlanProvider";
import { onboardingPath } from "../shared";

function dateAfter(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }

export default function CheckoutStep({ plan, billing, charge, email }: { plan: Plan; billing: BillingCadence; charge: { amount: string; interval: string }; email: string }) {
  const router = useRouter(); const { activate } = usePlan(); const [working, setWorking] = useState(false); const paid = plan.id !== "FREE";
  function finish() { setWorking(true); activate(plan.id); router.push(plan.id === "TEAM" ? "/team" : "/dashboard"); }
  return <section className="checkout-layout"><div className="onboarding-panel checkout-main"><p className="eyebrow">REVIEW AND CHECKOUT</p><h1>{paid ? `Start your ${plan.name} trial.` : "Confirm your free plan."}</h1><p>Review the exact access and billing details before continuing.</p>
    <div className="checkout-order"><div><span>{plan.name} plan</span><strong>{charge.amount}</strong></div><small>{paid ? `${charge.interval} after the 7-day trial. Cancel whenever you want.` : "Free forever. No payment details required."}</small></div>
    <ul className="checkout-features">{plan.features.map(feature => <li key={feature}><span>✓</span>{feature}</li>)}</ul>
    <div className="payment-placeholder"><div><b>{paid ? "Payment details" : "No payment needed"}</b><span>{paid ? "Stripe is not connected in this preview, so no card is collected and no charge is scheduled." : "Your free access starts immediately."}</span></div><span className="payment-status">PREVIEW</span></div>
    <p className="cancel-reassurance"><b>No commitment.</b> You can cancel online in 2 clicks from your account settings at any time.</p>
    <div className="checkout-actions"><button className="button button-dark" disabled={working} onClick={finish}>{working ? "Opening…" : paid ? `Start ${plan.name} preview access →` : "Start free access →"}</button><button className="button button-ghost" onClick={() => router.push("/dashboard")}>Cancel and return to dashboard</button></div>
    <button className="text-link checkout-back" onClick={() => router.push(onboardingPath("plan", plan.id, billing))}>← Back to plan selection</button>
  </div><aside className="trial-card"><p className="eyebrow">{paid ? "YOUR TRIAL TIMELINE" : "YOUR ACCESS TIMELINE"}</p><h2>Know what happens next.</h2><div className="trial-timeline"><article><i /><div><b>Today · {dateAfter(0)}</b><span>Immediate access</span><strong>$0.00</strong></div></article>{paid && <article><i /><div><b>Day 5 · {dateAfter(5)}</b><span>Reminder email sent</span><strong>$0.00</strong></div></article>}<article><i /><div><b>{paid ? `Day 7 · ${dateAfter(7)}` : "Ongoing"}</b><span>{paid ? "Trial ends · first billing" : "Free access continues"}</span><strong>{paid ? charge.amount : "$0.00"}</strong></div></article></div>{paid ? <><p className="trial-reminder">We will send a reminder to <b>{email}</b> 2 days before your trial expires.</p><small>Preview note: these dates illustrate the checkout schedule. Billing and reminder emails begin only after Stripe is connected.</small></> : <p className="trial-reminder">No trial expiration, payment details, or recurring charge.</p>}</aside></section>;
}
