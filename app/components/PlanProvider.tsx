"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isPlanId, planFor, planRank, type PlanId } from "../../src/billing/plans";

const STORAGE_KEY = "rr-preview-plan";
type PlanContextValue = { activePlan: PlanId; ready: boolean; activate: (plan: PlanId) => void; includes: (plan: PlanId) => boolean };
const PlanContext = createContext<PlanContextValue | null>(null);

export default function PlanProvider({ children }: { children: React.ReactNode }) {
  const [activePlan, setActivePlan] = useState<PlanId>("FREE");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isPlanId(stored)) setActivePlan(stored);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const activate = useCallback((plan: PlanId) => {
    setActivePlan(plan);
    window.localStorage.setItem(STORAGE_KEY, plan);
  }, []);

  const value = useMemo(() => ({ activePlan, ready, activate, includes: (plan: PlanId) => planRank[activePlan] >= planRank[plan] }), [activePlan, activate, ready]);
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const value = useContext(PlanContext);
  if (!value) throw new Error("usePlan must be used inside PlanProvider");
  return { ...value, plan: planFor(value.activePlan) };
}
