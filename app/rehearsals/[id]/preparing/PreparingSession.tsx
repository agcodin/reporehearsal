"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Session = { id: string; status: string; mode: string; timeLimitMinutes: number; repositoryName: string; incidentTemplateId: string };
const steps = ["Source snapshot copied", "Workspace boundary validated", "Controlled fault injected", "Incident evidence prepared"];

export default function PreparingSession({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const token = typeof window === "undefined" ? "" : sessionStorage.getItem(`rr-session-${sessionId}`) ?? "";

  useEffect(() => {
    let active = true;
    async function prepare() {
      try {
        const headers: Record<string, string> = token ? { "x-rehearsal-access": token } : {};
        let response = await fetch(`/api/rehearsals/${sessionId}`, { headers });
        let data = await response.json();
        if (!response.ok) throw new Error(data.error?.message ?? "Rehearsal not found.");
        let next = data.session as Session;
        if (next.status === "PREPARING") {
          response = await fetch(`/api/rehearsals/${sessionId}/prepare`, { method: "POST", headers });
          data = await response.json();
          if (!response.ok) throw new Error(data.error?.message ?? "Workspace preparation failed.");
          next = data.session;
        }
        if (!active) return;
        if (next.status === "ACTIVE") router.replace(`/rehearsals/${sessionId}/workspace`);
        else setSession(next);
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Workspace preparation failed."); }
    }
    void prepare();
    return () => { active = false; };
  }, [router, sessionId, token]);

  async function start() {
    setStarting(true); setError("");
    try {
      const headers: Record<string, string> = token ? { "x-rehearsal-access": token } : {};
      const response = await fetch(`/api/rehearsals/${sessionId}/start`, { method: "POST", headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "The rehearsal could not start.");
      router.push(`/rehearsals/${sessionId}/workspace`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The rehearsal could not start."); setStarting(false); }
  }

  return <main className="prepare-page">
    <p className="eyebrow">PREPARING ISOLATED WORKSPACE</p>
    <h1>{error ? "The workspace needs attention." : session ? "Your incident is ready." : "Building a disposable rehearsal…"}</h1>
    <p>{error || "Your repository snapshot stays unchanged while this session receives its own working copy."}</p>
    <div className="stepper">{steps.map((step, index) => <div className="prep-step" key={step}><span className="check">{session ? "✓" : index === 0 ? "•" : "·"}</span><b>{step}</b><small>{session ? "DONE" : "WAITING"}</small></div>)}</div>
    {session && <><div className="prepare-note"><b>Session boundary</b><br />Repository: {session.repositoryName} · Server-managed working copy · Approved commands only · Automatic expiry</div><div className="prepare-summary"><span>{session.mode.toLowerCase()} mode</span><span>{session.timeLimitMinutes}-minute limit</span><span>{session.incidentTemplateId === "repository-generated-v1" ? "repository-derived incident" : session.incidentTemplateId.replaceAll("-", " ")}</span></div></>}
    {session?.status === "READY" ? <div style={{ marginTop: 30 }}><button className="button button-accent" onClick={start} disabled={starting}>{starting ? "Starting…" : "Open incident workspace →"}</button></div> : !error && <p className="prepare-waiting" role="status">The workspace will open when preparation is complete.</p>}
  </main>;
}
