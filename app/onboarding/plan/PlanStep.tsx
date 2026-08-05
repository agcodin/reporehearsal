"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { plans, priceForCadence, type BillingCadence, type PlanId } from "../../../src/billing/plans";
import { onboardingPath } from "../shared";

export default function PlanStep({ initialPlan, initialBilling }: { initialPlan: PlanId; initialBilling: BillingCadence }) {
  const router = useRouter(); const [planId, setPlanId] = useState(initialPlan); const [billing, setBilling] = useState(initialBilling);
  return <section className="onboarding-panel onboarding-plan-panel"><div className="onboarding-heading-row"><div><p className="eyebrow">CHOOSE A PLAN</p><h1>Pick the access you need.</h1><p>Every paid option includes a 7-day trial. Cancel online whenever you want.</p></div><div className="onboarding-cadence" aria-label="Billing cadence">{(["weekly", "monthly", "annual"] as BillingCadence[]).map(item => <button className={billing === item ? "active" : ""} aria-pressed={billing === item} onClick={() => setBilling(item)} key={item}>{item === "annual" ? "Annual · save 20%" : item[0].toUpperCase() + item.slice(1)}</button>)}</div></div>
    <div className="onboarding-plan-grid">{plans.map(plan => { const price = priceForCadence(plan, billing); return <button className={`onboarding-plan-card ${planId === plan.id ? "selected" : ""}`} aria-pressed={planId === plan.id} onClick={() => setPlanId(plan.id)} key={plan.id}><span className="plan-choice"><i />{plan.name}</span><span className="onboarding-price"><strong>{price.price}</strong><small>{price.cadence}</small>{price.monthlyEquivalent && <small className="monthly-equivalent">{price.monthlyEquivalent}</small>}</span><span className="billing-clarity">{plan.id === "FREE" ? "No card required." : billing === "annual" ? "Billed annually. Cancel whenever you want." : `Billed ${billing}. Cancel whenever you want.`}</span><ul>{plan.features.map(feature => <li key={feature}>✓ {feature}</li>)}</ul></button>; })}</div>
    <div className="onboarding-actions"><button className="button button-dark" onClick={() => router.push(onboardingPath("checkout", planId, billing))}>Continue with {plans.find(plan => plan.id === planId)?.name} →</button><button className="text-link" onClick={() => router.back()}>Back to preferences</button></div>
  </section>;
}
