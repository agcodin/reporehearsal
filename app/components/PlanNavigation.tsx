"use client";

import Link from "next/link";
import { usePlan } from "./PlanProvider";

export default function PlanNavigation() {
  const { plan, ready } = usePlan();
  return <Link href="/pricing" className="plan-nav-pill" aria-label="View plans and preview access"><span>{ready ? plan.name : "Free"}</span><small>PREVIEW</small></Link>;
}
