"use client";

import Link from "next/link";
import { usePlan } from "../components/PlanProvider";
import type { TrainingRecommendation } from "../../src/accounts/curriculum";

export default function TrainingRecommendation({ rec }: { rec: TrainingRecommendation }) {
  const { includes, activate, ready } = usePlan();
  if (!ready) return null; // hold until the preview plan hydrates so we don't flash the wrong state

  if (!rec.unlocked) {
    const remaining = rec.needed - rec.solved;
    const pct = Math.min(100, Math.round((rec.solved / rec.needed) * 100));
    return <section className="training-card">
      <div className="training-head"><span>ADAPTIVE TRAINING</span><b>Locked</b></div>
      <p>Solve {remaining} more rehearsal{remaining === 1 ? "" : "s"} to unlock recommendations that pick your next incident automatically.</p>
      <div className="training-progress"><i style={{ width: `${pct}%` }} /></div>
      <small>{rec.solved} / {rec.needed} solved</small>
    </section>;
  }

  if (!includes("PRO")) {
    return <section className="training-card">
      <div className="training-head"><span>ADAPTIVE TRAINING</span><b className="unlocked">Unlocked</b></div>
      <h3>Your training plan is ready.</h3>
      <p>You have solved {rec.solved} rehearsals. Activate Pro to get a personalized next incident after every session.</p>
      <button className="button button-blue button-small" onClick={() => activate("PRO")}>Activate Pro preview →</button>
    </section>;
  }

  return <section className="training-card active">
    <div className="training-head"><span>RECOMMENDED NEXT</span><b className={rec.kind === "new" ? "tag-new" : "tag-focus"}>{rec.kind === "new" ? "NEW SKILL" : "FOCUS"}</b></div>
    <h3>{rec.categoryLabel}</h3>
    <p>{rec.reason}</p>
    <Link className="button button-blue button-small" href={`/rehearsals/new?incidentId=${encodeURIComponent(rec.incidentId)}`}>Start this incident →</Link>
  </section>;
}
