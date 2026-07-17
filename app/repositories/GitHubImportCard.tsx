"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBytes } from "../../src/billing/plans";
import { usePlan } from "../components/PlanProvider";

type ImportedRepository = { id:string; fullName: string; description: string | null; sourceUrl: string; defaultBranch: string; stars: number; fileCount: number; repositorySizeKb: number; stack: Record<string, string>; compatibleIncidentIds: string[]; warnings: string[] };
type ConnectedRepository = { id: string; name: string; fullName: string; sourceUrl: string; description: string | null; language: string | null; defaultBranch: string; updatedAt: string };

export default function GitHubImportCard({ connectedRepositories = [] }: { connectedRepositories?: ConnectedRepository[] }) {
  const router=useRouter();
  const { activePlan, plan } = usePlan();
  const [url, setUrl] = useState("");
  const [selectedRepository, setSelectedRepository] = useState(connectedRepositories[0]?.sourceUrl ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [repository, setRepository] = useState<ImportedRepository | null>(null);

  async function importRepository(sourceUrl: string) {
    setStatus("loading"); setMessage(""); setRepository(null);
    try {
      const response = await fetch("/api/repositories/github", { method: "POST", headers: { "Content-Type": "application/json", "x-reporehearsal-plan": activePlan }, body: JSON.stringify({ url: sourceUrl }) });
      const result = await response.json() as { repository?: ImportedRepository; accessToken?:string; error?: { message?: string } };
      if (!response.ok || !result.repository || !result.accessToken) throw new Error(result.error?.message ?? "Import failed.");
      sessionStorage.setItem(`rr-repository-${result.repository.id}`,result.accessToken);
      setRepository(result.repository); setStatus("success");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Import failed."); setStatus("error"); }
  }

  async function submit(event: FormEvent) { event.preventDefault(); await importRepository(url); }
  async function submitConnected(event: FormEvent) { event.preventDefault(); if (selectedRepository) await importRepository(selectedRepository); }

  async function remove() {
    if (!repository) return;
    const token=sessionStorage.getItem(`rr-repository-${repository.id}`)??"";
    const response=await fetch(`/api/repositories/${repository.id}`,{method:"DELETE",headers:token?{"x-repository-access":token}:{}});
    if (!response.ok) { const result=await response.json() as{error?:{message?:string}}; setMessage(result.error?.message??"The stored copy could not be removed."); setStatus("error"); return; }
    sessionStorage.removeItem(`rr-repository-${repository.id}`); setRepository(null); setStatus("idle"); setMessage("");
  }

  return <article className="repo-card repository-entry-card github-import-card">
    <div><h2>Import from GitHub</h2><p>{connectedRepositories.length ? "Choose one of your public repositories or paste a link." : "Paste a public repository link."}</p></div>
    <div className="github-import-options">
      {connectedRepositories.length > 0 && <form onSubmit={submitConnected} className="connected-repository-form"><label htmlFor="connected-github-repository">Your public repositories</label><div><select id="connected-github-repository" value={selectedRepository} onChange={event => setSelectedRepository(event.target.value)}>{connectedRepositories.map(item => <option value={item.sourceUrl} key={item.id}>{item.fullName}{item.language ? ` · ${item.language}` : ""}</option>)}</select><button className="button button-dark" disabled={status === "loading"}>{status === "loading" ? "Importing…" : "Import selected"}</button></div></form>}
      <form onSubmit={submit} className="github-import-form"><label className={connectedRepositories.length ? "github-url-label" : "sr-only"} htmlFor="github-url">Public GitHub URL</label><div><input id="github-url" type="url" required value={url} onChange={event => setUrl(event.target.value)} placeholder="https://github.com/owner/repository" aria-describedby="github-import-help"/><button className="button button-ghost" disabled={status === "loading"}>{status === "loading" ? "Importing…" : "Import URL"}</button></div><small id="github-import-help">Public only · {formatBytes(plan.limits.repositoryUploadBytes)} maximum</small></form>
    </div>
    {status === "error" && <div className="import-result import-error" role="alert"><b>Import stopped safely</b><p>{message}</p></div>}
    {repository && <div className="import-result" aria-live="polite"><div className="import-result-head"><div><span className="badge badge-green">ANALYSIS COMPLETE</span><h3>{repository.fullName}</h3><p>{repository.description ?? "No description supplied by the repository owner."}</p></div><a className="text-link" href={repository.sourceUrl} target="_blank" rel="noreferrer">View source ↗</a></div><div className="repo-meta"><div><small>FILES</small><b>{repository.fileCount.toLocaleString()}</b></div><div><small>DEFAULT BRANCH</small><b>{repository.defaultBranch}</b></div><div><small>SIZE</small><b>{Math.max(1, Math.round(repository.repositorySizeKb / 1024))} MB</b></div></div><div className="tag-row">{Object.values(repository.stack).filter(value => value !== "unknown").map(value => <span className="tag" key={value}>{value}</span>)}</div><p><b>{repository.compatibleIncidentIds.length}</b> compatible incident template{repository.compatibleIncidentIds.length === 1 ? "" : "s"} detected. The safe source snapshot is attached to your account.</p>{repository.warnings.map(warning => <p className="import-warning" key={warning}>{warning}</p>)}<div className="actions"><button className="button button-blue" onClick={()=>router.push(`/rehearsals/new?repositoryId=${encodeURIComponent(repository.id)}`)}>Create rehearsal →</button><button className="button button-ghost" onClick={remove}>Remove stored copy</button></div></div>}
  </article>;
}
