"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type UploadResult = {
  id: string; name: string; fileCount: number; analyzedFileCount: number; totalBytes: number;
  stack: Record<string, string>; detectedFiles: string[]; compatibleIncidentIds: string[]; warnings: string[];
};

export default function LocalUploadCard() {
  const router = useRouter();
  const folderInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState("");
  const [repository, setRepository] = useState<UploadResult | null>(null);
  useEffect(() => { folderInput.current?.setAttribute("webkitdirectory", ""); }, []);

  async function upload(files: File[], paths: string[], name: string, archive = false) {
    setStatus("loading"); setMessage(""); setRepository(null);
    try {
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > 20 * 1024 * 1024) throw new Error("Choose a codebase that is 20 MB or smaller.");
      const form = new FormData(); form.set("name", name);
      if (archive) form.set("archive", files[0]);
      else { files.forEach(file => form.append("files", file)); form.set("paths", JSON.stringify(paths)); }
      const response = await fetch("/api/repositories/upload", { method: "POST", body: form });
      const result = await response.json() as { repository?: UploadResult; accessToken?: string; savedToAccount?: boolean; error?: { message?: string } };
      if (!response.ok || !result.repository || !result.accessToken) throw new Error(result.error?.message ?? "The codebase could not be analyzed.");
      sessionStorage.setItem(`rr-repository-${result.repository.id}`, result.accessToken);
      setRepository(result.repository); setMessage(result.savedToAccount ? "The safe source snapshot and its metadata are attached to your account." : "Analysis complete. This anonymous source snapshot expires after 24 hours."); setStatus("success");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The codebase could not be analyzed."); setStatus("error"); }
  }

  function chooseFolder(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const paths = files.map(file => file.webkitRelativePath || file.name);
    const rootName = paths[0]?.split("/")[0] || "Uploaded codebase";
    void upload(files, paths, rootName);
    event.target.value = "";
  }

  function chooseZip(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void upload([file], [file.name], file.name.replace(/\.zip$/i, ""), true);
    event.target.value = "";
  }

  async function remove() {
    if (!repository) return;
    const token=sessionStorage.getItem(`rr-repository-${repository.id}`)??"";
    const response=await fetch(`/api/repositories/${repository.id}`,{method:"DELETE",headers:token?{"x-repository-access":token}:{}});
    if (!response.ok) { const result=await response.json() as{error?:{message?:string}}; setMessage(result.error?.message??"The stored copy could not be removed."); setStatus("error"); return; }
    sessionStorage.removeItem(`rr-repository-${repository.id}`); setRepository(null); setStatus("idle"); setMessage("");
  }

  return <article className="repo-card local-upload-card">
    <div className="github-import-heading"><span className="repo-source-mark local-mark">LOCAL</span><div><span className="badge badge-green">LOCAL CODEBASE</span><h2>Upload from your computer</h2></div></div>
    <p>Select a project folder or ZIP archive. Analysis runs against a read-only copy; generated folders, secrets, keys, binaries, and oversized files are excluded.</p>
    <div className="local-upload-actions">
      <label className={`button button-dark ${status === "loading" ? "button-disabled" : ""}`}>Choose project folder<input ref={folderInput} type="file" multiple onChange={chooseFolder} disabled={status === "loading"} /></label>
      <label className={`button button-ghost ${status === "loading" ? "button-disabled" : ""}`}>Choose ZIP archive<input type="file" accept=".zip,application/zip" onChange={chooseZip} disabled={status === "loading"} /></label>
    </div>
    <small>Maximum 20 MB expanded · 3,000 files · supported text source and configuration files</small>
    {status === "loading" && <div className="upload-progress" role="status"><span className="pulse" /> Reading and mapping the codebase…</div>}
    {status === "error" && <div className="import-result import-error" role="alert"><b>Upload stopped safely</b><p>{message}</p></div>}
    {repository && <div className="import-result" aria-live="polite"><div className="import-result-head"><div><span className="badge badge-green">ANALYSIS COMPLETE</span><h3>{repository.name}</h3><p>{repository.analyzedFileCount.toLocaleString()} safe text files analyzed from {repository.fileCount.toLocaleString()} selected files.</p></div></div><div className="repo-meta"><div><small>ANALYZED</small><b>{repository.analyzedFileCount.toLocaleString()}</b></div><div><small>SIZE</small><b>{Math.max(1, Math.round(repository.totalBytes / 1024))} KB</b></div><div><small>INCIDENTS</small><b>{repository.compatibleIncidentIds.length}</b></div></div><div className="tag-row">{Object.values(repository.stack).filter(value => value !== "unknown").map(value => <span className="tag" key={value}>{value}</span>)}</div><p>{message}</p>{repository.warnings.map(warning => <p className="import-warning" key={warning}>{warning}</p>)}<div className="actions"><button className="button button-blue" onClick={()=>router.push(`/rehearsals/new?repositoryId=${encodeURIComponent(repository.id)}`)}>Create rehearsal →</button><button className="button button-ghost" onClick={remove}>Remove stored copy</button></div></div>}
  </article>;
}
