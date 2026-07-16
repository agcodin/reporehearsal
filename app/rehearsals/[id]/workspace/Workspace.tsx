"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CodeEditor from "../../../components/CodeEditor";

type Tab = "terminal" | "logs" | "tests" | "database" | "health";
type Timeline = { type: string; timestamp: string; summary: string };
type Session = { id: string; repositoryName: string; mode: string; status: string; startedAt: string | null; timeLimitMinutes: number; hintCount: number; hypotheses: string[]; timeline: Timeline[] };
type Briefing = { title: string; severity: string; customerReport: string; initialAlert: string; knownImpact: string[] };
type Evidence = { logs: string[]; database: string[]; health: string[]; briefing: Briefing; targetPath: string; hints: string[]; generated?: { engine: string; confidence: number; reason: string } };

export default function Workspace({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [path, setPath] = useState("");
  const [source, setSource] = useState("");
  const [savedSource, setSavedSource] = useState("");
  const [tab, setTab] = useState<Tab>("logs");
  const [consoleText, setConsoleText] = useState("Loading incident evidence…");
  const [hypothesis, setHypothesis] = useState("");
  const [activeHint, setActiveHint] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const token = typeof window === "undefined" ? "" : sessionStorage.getItem(`rr-session-${sessionId}`) ?? "";

  const api = useCallback(async (url: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (token) headers.set("x-rehearsal-access", token);
    const response = await fetch(url, { ...init, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? "The request failed.");
    return data;
  }, [token]);

  const openFile = useCallback(async (nextPath: string) => {
    setBusy("file"); setError("");
    try {
      const data = await api(`/api/rehearsals/${sessionId}/files/content?path=${encodeURIComponent(nextPath)}`);
      setPath(nextPath); setSource(data.content); setSavedSource(data.content);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The file could not be opened."); }
    finally { setBusy(""); }
  }, [api, sessionId]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const sessionData = await api(`/api/rehearsals/${sessionId}`);
        const fileData = await api(`/api/rehearsals/${sessionId}/files`);
        const evidenceData = await api(`/api/rehearsals/${sessionId}/evidence`);
        if (!active) return;
        if (sessionData.session.status === "COMPLETED") { router.replace(`/rehearsals/${sessionId}/report`); return; }
        if (sessionData.session.status !== "ACTIVE") { router.replace(`/rehearsals/${sessionId}/preparing`); return; }
        setSession(sessionData.session); setFiles(fileData.files); setEvidence(evidenceData.evidence);
        setConsoleText(`ALERT\n${evidenceData.evidence.briefing.initialAlert}\n\nUse the investigation tools to collect evidence before editing.`);
        await openFile(evidenceData.evidence.targetPath);
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "The rehearsal could not be loaded."); }
    }
    void load();
    return () => { active = false; };
  }, [api, openFile, router, sessionId]);

  useEffect(() => {
    if (!session?.startedAt) return;
    const startedAt = session.startedAt;
    const timeLimitMinutes = session.timeLimitMinutes;
    function update() { setRemaining(Math.max(0, timeLimitMinutes * 60 - Math.floor((Date.now() - Date.parse(startedAt)) / 1000))); }
    update(); const timer = window.setInterval(update, 1_000); return () => window.clearInterval(timer);
  }, [session?.startedAt, session?.timeLimitMinutes]);

  async function save() {
    if (!path || source === savedSource) return;
    setBusy("save"); setError("");
    try { await api(`/api/rehearsals/${sessionId}/files/content`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path, content: source }) }); setSavedSource(source); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Changes could not be saved."); }
    finally { setBusy(""); }
  }

  async function command(commandId: string, nextTab: Tab) {
    setBusy(commandId); setError("");
    try { if (source !== savedSource) await save(); const data = await api(`/api/rehearsals/${sessionId}/commands`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commandId }) }); setTab(nextTab); setConsoleText(data.result.output); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The command failed."); }
    finally { setBusy(""); }
  }

  async function showDatabase() {
    setBusy("database");
    try { const data = await api(`/api/rehearsals/${sessionId}/database/query`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ queryId: "compare-affected-records" }) }); setTab("database"); setConsoleText(data.rows.join("\n")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Evidence could not be loaded."); }
    finally { setBusy(""); }
  }

  async function showLogs() {
    setBusy("logs"); setError("");
    try { const data = await api(`/api/rehearsals/${sessionId}/logs`); setTab("logs"); setConsoleText(data.logs.join("\n")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Logs could not be loaded."); }
    finally { setBusy(""); }
  }

  async function addHypothesis() {
    if (!hypothesis.trim()) return;
    setBusy("hypothesis");
    try { const data = await api(`/api/rehearsals/${sessionId}/hypotheses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hypothesis }) }); setSession(current => current ? { ...current, hypotheses: data.hypotheses } : current); setHypothesis(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Hypothesis could not be recorded."); }
    finally { setBusy(""); }
  }

  async function hint() {
    setBusy("hint");
    try { const data = await api(`/api/rehearsals/${sessionId}/hints`, { method: "POST" }); setActiveHint(data.hint); setSession(current => current ? { ...current, hintCount: data.level } : current); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Hint could not be loaded."); }
    finally { setBusy(""); }
  }

  async function submit() {
    setBusy("submit"); setError("");
    try { if (source !== savedSource) await save(); await api(`/api/rehearsals/${sessionId}/submit`, { method: "POST" }); router.push(`/rehearsals/${sessionId}/report`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The repair could not be submitted."); setBusy(""); }
  }

  const timerText = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  if (!session || !evidence) return <main className="app-page"><p className="eyebrow">INCIDENT WORKSPACE</p><h1>{error || "Loading your rehearsal…"}</h1></main>;

  return <main className="workspace-page">
    <div className="workspace-top"><span className="badge badge-red">{evidence.briefing.severity}</span><h1>{evidence.briefing.title}</h1><span className={`mode-pill ${session.mode === "INTERVIEW" ? "interview" : ""}`}>{session.mode}</span><span className={`timer ${remaining < 300 ? "timer-warning" : ""}`}>{timerText}</span><button className="button button-danger button-small" onClick={submit} disabled={Boolean(busy)}>{busy === "submit" ? "Validating…" : "Submit repair →"}</button></div>
    {error && <div className="error-banner" role="alert">{error}</div>}
    <div className="workspace-grid">
      <aside className="file-panel"><div className="panel-head">EXPLORER · {session.repositoryName.toUpperCase()}</div><div className="file-tree">{files.map(file => <button className={path === file ? "active-file" : ""} onClick={() => void openFile(file)} key={file}>{file}</button>)}</div></aside>
      <section className="editor-zone"><div className="code-editor"><div className="editor-toolbar"><span className="editor-tab"><i className="ts-file-icon">{path.split(".").pop()?.slice(0, 3).toUpperCase() ?? "TXT"}</i>{path}</span><em>{source === savedSource ? "saved" : "● unsaved"}</em><button className="button button-ghost button-small" onClick={save} disabled={source === savedSource || Boolean(busy)}>{busy === "save" ? "Saving…" : "Save · ⌘S"}</button></div><CodeEditor path={path} value={source} onChange={setSource} onSave={() => void save()} /></div><div className="bottom-console"><div className="tabs">{(["terminal", "logs", "tests", "database", "health"] as Tab[]).map(item => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item.toUpperCase()}</button>)}</div><div className="console-body">{consoleText}</div></div></section>
      <aside className="side-panel"><div className="brief"><span className="badge badge-red">{evidence.briefing.severity}</span>{evidence.generated && <span className="badge badge-blue generated-badge">REPOSITORY-DERIVED · {Math.round(evidence.generated.confidence * 100)}% MATCH</span>}<h2>{evidence.briefing.title}</h2><p>{evidence.briefing.customerReport}</p>{evidence.generated && <p className="generated-reason"><b>Why this incident</b><br />Selected from a repairable behavior boundary found in the imported source snapshot.</p>}<p><b>Impact</b></p><ul>{evidence.briefing.knownImpact.map(item => <li key={item}>{item}</li>)}</ul></div>
        <div className="side-section"><div className="panel-head" style={{ padding: 0, border: 0 }}>INVESTIGATION TOOLS</div><button className="button button-ghost button-small" onClick={showLogs}>Inspect incident logs</button><button className="button button-ghost button-small" onClick={showDatabase}>Compare affected records</button><button className="button button-ghost button-small" onClick={() => command("migration-status", "terminal")}>Inspect dependency state</button><button className="button button-ghost button-small" onClick={() => command("run-tests", "tests")}>Run incident tests</button><button className="button button-ghost button-small" onClick={() => command("run-build", "terminal")}>Run build contract</button><button className="button button-ghost button-small" onClick={() => command("run-lint", "terminal")}>Run lint contract</button><button className="button button-ghost button-small" onClick={() => command("restart-service", "terminal")}>Restart service</button><button className="button button-ghost button-small" onClick={() => command("check-health", "health")}>Check service health</button></div>
        <div className="side-section"><div className="panel-head" style={{ padding: 0, border: 0 }}>HYPOTHESES</div>{session.hypotheses.map((item, index) => <div className="hint-box" key={`${item}-${index}`}>{item}</div>)}<textarea rows={3} value={hypothesis} onChange={event => setHypothesis(event.target.value)} aria-label="Investigation hypothesis" placeholder="State your belief and supporting evidence" /><button className="button button-ghost button-small" onClick={addHypothesis} disabled={busy === "hypothesis"}>Add hypothesis</button></div>
        {session.mode !== "INTERVIEW" ? <div className="side-section"><div className="panel-head" style={{ padding: 0, border: 0 }}>COACH · {session.hintCount}/{evidence.hints.length} HINTS</div><button className="button button-ghost button-small" onClick={hint} disabled={busy === "hint" || session.hintCount >= evidence.hints.length}>Request next hint</button>{activeHint && <div className="hint-box"><b>Level {session.hintCount}</b><br />{activeHint}</div>}</div> : <div className="side-section interview-lock"><div className="panel-head" style={{ padding: 0, border: 0 }}>INTERVIEW CONDITIONS</div><p>Coaching hints are disabled. The report emphasizes evidence use, verification, and communication.</p></div>}
        <div className="side-section"><div className="panel-head" style={{ padding: 0, border: 0 }}>TIMELINE</div>{session.timeline.map((item, index) => <div className="timeline-item" key={`${item.timestamp}-${index}`}><b>{item.summary}</b><span>{new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>)}</div>
      </aside>
    </div>
  </main>;
}
