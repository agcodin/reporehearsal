"use client";

import Link from "next/link";
import { formatBytes, plans } from "../../src/billing/plans";
import { usePlan } from "../components/PlanProvider";

export default function RepositoryLimitBanner() {
  const { plan } = usePlan();
  return <aside className="capacity-banner" aria-label={`${plan.name} analysis capacity`}>
    <div><span className="capacity-kicker">ACTIVE ANALYSIS CAPACITY</span><strong>{plan.name}</strong><p>Repository source is filtered locally and read as a temporary snapshot. It is never used to train a model.</p></div>
    <div className="capacity-current"><span>{formatBytes(plan.limits.repositoryUploadBytes)}</span><small>MAX SOURCE</small></div>
    <div className="capacity-current"><span>{plan.limits.repositoryFiles.toLocaleString()}</span><small>MAX FILES</small></div>
    <div className="capacity-scale" aria-label="Plan upload limits">{plans.map(item => <span className={item.id === plan.id ? "active" : ""} key={item.id}><i>{item.name}</i><b>{formatBytes(item.limits.repositoryUploadBytes)}</b></span>)}</div>
    <Link className="button button-ghost" href="/pricing#feature-breakdown">Compare capacity →</Link>
  </aside>;
}
