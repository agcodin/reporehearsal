"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { BillingCadence, Plan } from "../../../src/billing/plans";
import { onboardingPath } from "../shared";

function dateAfter(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }

export default function CheckoutStep({ plan, billing, charge, email }: { plan: Plan; billing: BillingCadence; charge: { amount: string; interval: string }; email: string }) {
  const router = useRouter(); const [working, setWorking] = useState(false); const [error, setError] = useState(""); const [beta, setBeta] = useState(false); const paid = plan.id !== "FREE";
  useEffect(() => { void fetch("/api/billing/subscription", { cache: "no-store" }).then(async response => response.ok ? await response.json() : null).then(summary => setBeta(summary?.beta === true)).catch(() => {}); }, []);
  async function finish() {
    if (!paid) { router.push("/dashboard"); return; }
    setWorking(true); setError("");
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: plan.id, cadence: billing }) });
      const body = await response.json();
      if (!response.ok || !body.url) throw new Error(body.error?.message ?? "Checkout could not be opened.");
      window.location.assign(body.url);
    } catch (checkoutError) { setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not be opened."); setWorking(false); }
  }
  return <section className="checkout-layout"><div className="onboarding-panel checkout-main"><p className="eyebrow">{beta ? "BETA ACCESS" : "REVIEW AND CHECKOUT"}</p><h1>{beta ? `Activate ${plan.name} at no cost.` : paid ? `Start your ${plan.name} trial.` : "Confirm your free plan."}</h1><p>{beta ? "All plans are available free during the beta. No payment details are collected." : "Review the exact access and billing details before continuing."}</p>
    <div className="checkout-order"><div><span>{plan.name} plan</span><strong>{beta ? "$0.00" : charge.amount}</strong></div><small>{beta ? "Beta access is free. Billing is disabled for this activation." : paid ? `${charge.interval} after the 7-day trial. Cancel whenever you want.` : "Free forever. No payment details required."}</small></div>
    <ul className="checkout-features">{plan.features.map(feature => <li key={feature}><span>✓</span>{feature}</li>)}</ul>
    <div className="payment-placeholder"><div><b>{beta ? "No payment needed" : paid ? "Secure payment with Stripe" : "No payment needed"}</b><span>{beta ? "Your beta access starts immediately." : paid ? "Continue to Stripe to add payment details and optionally enter a promotion code. RepoRehearsal never sees your card number." : "Your free access starts immediately."}</span></div><span className="payment-status">{beta ? "BETA" : "STRIPE"}</span></div>
    <p className="cancel-reassurance"><b>{beta ? "Beta access is free." : "No commitment."}</b> {beta ? "You can use every plan while beta access is enabled." : "You can cancel online in 2 clicks from your account settings at any time."}</p>
    <div className="checkout-actions"><button className="button button-dark" disabled={working} onClick={finish}>{working ? "Activating…" : beta ? "Activate beta access →" : paid ? `Continue to secure checkout →` : "Start free access →"}</button><button className="button button-ghost" onClick={() => router.push("/dashboard")}>Cancel and return to dashboard</button></div>{error && <p className="account-management-status" role="alert">{error}</p>}
    <button className="text-link checkout-back" onClick={() => router.push(onboardingPath("plan", plan.id, billing))}>← Back to plan selection</button>
  </div><aside className="trial-card"><p className="eyebrow">{beta ? "BETA ACCESS" : paid ? "YOUR TRIAL TIMELINE" : "YOUR ACCESS TIMELINE"}</p><h2>{beta ? "Everything is open." : "Know what happens next."}</h2><div className="trial-timeline"><article><i /><div><b>Today · {dateAfter(0)}</b><span>Immediate access</span><strong>$0.00</strong></div></article>{!beta && paid && <article><i /><div><b>Day 5 · {dateAfter(5)}</b><span>Reminder email sent</span><strong>$0.00</strong></div></article>}<article><i /><div><b>{beta ? "During beta" : paid ? `Day 7 · ${dateAfter(7)}` : "Ongoing"}</b><span>{beta ? "All plan features remain available" : paid ? "Trial ends · first billing" : "Free access continues"}</span><strong>{beta ? "$0.00" : paid ? charge.amount : "$0.00"}</strong></div></article></div>{beta ? <p className="trial-reminder">No payment method, charge, or plan commitment is required during beta.</p> : paid ? <><p className="trial-reminder">We will send a reminder to <b>{email}</b> 2 days before your trial expires.</p><small>Promotion codes are redeemed on Stripe&apos;s secure checkout page. Your selected price and trial remain visible there before you confirm.</small></> : <p className="trial-reminder">No trial expiration, payment details, or recurring charge.</p>}</aside></section>;
}
