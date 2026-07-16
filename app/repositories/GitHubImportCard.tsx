"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBytes } from "../../src/billing/plans";
import { usePlan } from "../components/PlanProvider";

type ImportedRepository = { id:string; fullName: string; description: string | null; sourceUrl: string; defaultBranch: string; stars: number; fileCount: number; repositorySizeKb: number; stack: Record<string, string>; compatibleIncidentIds: string[]; warnings: string[] };

export default function GitHubImportCard() {
  const router=useRouter();
  const { activePlan, plan } = usePlan();
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [repository, setRepository] = useState<ImportedRepository | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setStatus("loading"); setMessage(""); setRepository(null);
    try {
      const response = await fetch("/api/repositories/github", { method: "POST", headers: { "Content-Type": "application/json", "x-reporehearsal-plan": activePlan }, body: JSON.stringify({ url }) });
      const result = await response.json() as { repository?: ImportedRepository; accessToken?:string; savedToAccount?: boolean; error?: { message?: string } };
      if (!response.ok || !result.repository || !result.accessToken) throw new Error(result.error?.message ?? "Import failed.");
      sessionStorage.setItem(`rr-repository-${result.repository.id}`,result.accessToken);
      setRepository(result.repository); setSaved(Boolean(result.savedToAccount)); setStatus("success");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Import failed."); setStatus("error"); }
  }
  async function remove() {
    if (!repository) return;
    const token=sessionStorage.getItem(`rr-repository-${repository.id}`)??"";
    const response=await fetch(`/api/repositories/${repository.id}`,{method:"DELETE",headers:token?{"x-repository-access":token}:{}});
    if (!response.ok) { const result=await response.json() as{error?:{message?:string}}; setMessage(result.error?.message??"The stored copy could not be removed."); setStatus("error"); return; }
    sessionStorage.removeItem(`rr-repository-${repository.id}`); setRepository(null); setStatus("idle"); setMessage("");
  }
  return <article className="repo-card github-import-card"><div className="github-import-heading"><span className="repo-source-mark">GH</span><div><span className="badge badge-blue">PUBLIC GITHUB</span><h2>Paste a repository link</h2></div></div><p>Analyze a public TypeScript repository without modifying it. No account is required; signed-in imports are also listed on your dashboard.</p><form onSubmit={submit} className="github-import-form"><label htmlFor="github-url">GitHub repository URL</label><div><input id="github-url" type="url" required value={url} onChange={event => setUrl(event.target.value)} placeholder="https://github.com/owner/repository" aria-describedby="github-import-help"/><button className="button button-dark" disabled={status === "loading"}>{status === "loading" ? "Analyzing…" : "Analyze repository →"}</button></div><small id="github-import-help">{plan.name} preview · {formatBytes(plan.limits.repositoryUploadBytes)} · {plan.limits.repositoryFiles.toLocaleString()} files · no symlinks or submodules</small></form>{status === "error" && <div className="import-result import-error" role="alert"><b>Import stopped safely</b><p>{message}</p></div>}{repository && <div className="import-result" aria-live="polite"><div className="import-result-head"><div><span className="badge badge-green">ANALYSIS COMPLETE</span><h3>{repository.fullName}</h3><p>{repository.description ?? "No description supplied by the repository owner."}</p></div><a className="text-link" href={repository.sourceUrl} target="_blank" rel="noreferrer">View source ↗</a></div><div className="repo-meta"><div><small>FILES</small><b>{repository.fileCount.toLocaleString()}</b></div><div><small>DEFAULT BRANCH</small><b>{repository.defaultBranch}</b></div><div><small>SIZE</small><b>{Math.max(1, Math.round(repository.repositorySizeKb / 1024))} MB</b></div></div><div className="tag-row">{Object.values(repository.stack).filter(value => value !== "unknown").map(value => <span className="tag" key={value}>{value}</span>)}</div><p><b>{repository.compatibleIncidentIds.length}</b> compatible incident template{repository.compatibleIncidentIds.length === 1 ? "" : "s"} detected. {saved ? "The safe source snapshot and its metadata are attached to your account." : "This anonymous source snapshot expires after 24 hours."}</p>{repository.warnings.map(warning => <p className="import-warning" key={warning}>{warning}</p>)}<div className="actions"><button className="button button-blue" onClick={()=>router.push(`/rehearsals/new?repositoryId=${encodeURIComponent(repository.id)}`)}>Create rehearsal →</button><button className="button button-ghost" onClick={remove}>Remove stored copy</button></div></div>}</article>;
}
