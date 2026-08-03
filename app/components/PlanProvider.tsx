"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { planFor, planRank, type PlanId } from "../../src/billing/plans";

type PlanContextValue = { activePlan: PlanId; ready: boolean; activate: (plan: PlanId) => void; includes: (plan: PlanId) => boolean };
const PlanContext = createContext<PlanContextValue | null>(null);

export default function PlanProvider({ children }: { children: React.ReactNode }) {
  const [activePlan, setActivePlan] = useState<PlanId>("FREE");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let current = true;
    void fetch("/api/billing/subscription", { cache: "no-store" })
      .then(async response => response.ok ? await response.json() : null)
      .then(summary => { if (current && (summary?.plan === "FREE" || summary?.plan === "PRO" || summary?.plan === "TEAM")) setActivePlan(summary.plan); })
      .catch(() => { /* The authenticated API remains the source of truth for protected actions. */ })
      .finally(() => { if (current) setReady(true); });
    return () => { current = false; };
  }, []);

  const activate = useCallback((plan: PlanId) => {
    if (plan === "FREE") { setActivePlan("FREE"); return; }
    window.location.assign(`/onboarding/account?plan=${plan}&billing=monthly`);
  }, []);

  const value = useMemo(() => ({ activePlan, ready, activate, includes: (plan: PlanId) => planRank[activePlan] >= planRank[plan] }), [activePlan, activate, ready]);
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const value = useContext(PlanContext);
  if (!value) throw new Error("usePlan must be used inside PlanProvider");
  return { ...value, plan: planFor(value.activePlan) };
}
