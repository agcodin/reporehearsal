"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { curatedRepositories, type CuratedRepository } from "../../../src/repositories/curated-catalog";
import { usePlan } from "../../components/PlanProvider";

const categories = ["All", "Full-stack", "Backend", "Frontend", "Applications", "Developer tooling"] as const;

function randomIndex(length: number) {
  if (length < 2) return 0;
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % length;
}

function shuffledSample(items: CuratedRepository[], count = 12) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = randomIndex(index + 1);
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy.slice(0, count);
}

export default function CuratedCatalog() {
  const router = useRouter();
  const { activePlan, includes, activate, ready, plan } = usePlan();
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<CuratedRepository[]>(() => curatedRepositories.slice(0, 12));
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");

  const pool = useMemo(() => curatedRepositories.filter(repository => {
    const matchesCategory = category === "All" || repository.category === category;
    const search = query.trim().toLowerCase();
    return matchesCategory && (!search || `${repository.fullName} ${repository.description} ${repository.focus}`.toLowerCase().includes(search));
  }), [category, query]);

  function refreshSelection(nextPool = pool) {
    setSelection(shuffledSample(nextPool.length ? nextPool : curatedRepositories));
    setError("");
  }

  async function begin(repository: CuratedRepository) {
    setWorking(repository.id); setError("");
    try {
      const response = await fetch("/api/repositories/github", { method: "POST", headers: { "Content-Type": "application/json", "x-reporehearsal-plan": activePlan }, body: JSON.stringify({ url: repository.url }) });
      const result = await response.json() as { repository?: { id: string }; accessToken?: string; error?: { message?: string } };
      if (!response.ok || !result.repository || !result.accessToken) throw new Error(result.error?.message ?? "This repository could not be prepared.");
      sessionStorage.setItem(`rr-repository-${result.repository.id}`, result.accessToken);
      sessionStorage.setItem("rr-last-curated-repository", repository.id);
      router.push(`/rehearsals/new?repositoryId=${encodeURIComponent(result.repository.id)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This repository could not be prepared.");
      setWorking(null);
    }
  }

  function startRandom() {
    const candidates = pool.length ? pool : curatedRepositories;
    const previous = sessionStorage.getItem("rr-last-curated-repository");
    const fresh = candidates.filter(repository => repository.id !== previous);
    const repository = (fresh.length ? fresh : candidates)[randomIndex(fresh.length || candidates.length)];
    if (repository) void begin(repository);
  }

  if (!ready) return <main className="app-page"><div className="account-loading"><span className="pulse" /> Loading the curated repository lab…</div></main>;
  if (!includes("PRO")) return <main className="app-page"><section className="feature-gate curated-gate"><span className="badge badge-blue">PRO REPOSITORY LAB</span><h1>Practice on a different real project every time.</h1><p>Pro and higher plans unlock a curated catalog of {curatedRepositories.length} active public TypeScript repositories. RepoRehearsal selects a project, maps its code, and generates a repairable incident from a real source boundary.</p><div className="actions"><button className="button button-blue" onClick={() => activate("PRO")}>Activate Pro preview →</button><Link className="button button-ghost" href="/pricing">Compare plans</Link></div></section></main>;

  return <main className="curated-page">
    <section className="curated-hero page-pad"><div><p className="eyebrow">PRO REPOSITORY ROULETTE</p><h1>Real projects.<br /><em>Unknown incident.</em></h1><p>Choose from {curatedRepositories.length} vetted open-source projects—or let RepoRehearsal draw one at random. The analyzer turns a real code boundary into the incident you have to diagnose.</p><div className="actions"><button className="button button-accent" onClick={startRandom} disabled={Boolean(working)}>{working ? "Selecting and analyzing…" : "Start a random rehearsal →"}</button><button className="button curated-hero-ghost" onClick={() => refreshSelection()} disabled={Boolean(working)}>Shuffle the shelf</button></div><small>{plan.name} preview · recognized open-source licenses · original repositories stay untouched</small></div><aside><span>CURATION STANDARD</span><div><b>{curatedRepositories.length}</b><small>ACTIVE PROJECTS</small></div><div><b>2024+</b><small>RECENT ACTIVITY</small></div><div><b>≤ 20 MB</b><small>BOUNDED SOURCE</small></div><p>Projects are filtered for activity, source size, license, and analyzable TypeScript—not for a prewritten answer.</p></aside></section>
    <section className="curated-library page-pad"><div className="curated-library-head"><div><p className="eyebrow">CURATED PROJECT SHELF</p><h2>Pick the system you want to enter.</h2><p>Showing 12 projects at a time. Shuffle for a new draw or narrow the pool first.</p></div><div className="curated-search"><label htmlFor="curated-search">Search the catalog</label><input id="curated-search" type="search" value={query} onChange={event => { setQuery(event.target.value); const search = event.target.value.trim().toLowerCase(); const next = curatedRepositories.filter(repository => (category === "All" || repository.category === category) && (!search || `${repository.fullName} ${repository.description} ${repository.focus}`.toLowerCase().includes(search))); setSelection(shuffledSample(next)); }} placeholder="React, data, validation…" /></div></div>
      <div className="curated-filters" aria-label="Repository categories">{categories.map(item => <button className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => { setCategory(item); const next = curatedRepositories.filter(repository => (item === "All" || repository.category === item) && (!query.trim() || `${repository.fullName} ${repository.description} ${repository.focus}`.toLowerCase().includes(query.trim().toLowerCase()))); setSelection(shuffledSample(next)); }} key={item}>{item}</button>)}<span>{pool.length} matching</span></div>
      {error && <div className="curated-error" role="alert"><b>That draw could not be prepared.</b><span>{error}</span><button className="text-link" onClick={startRandom}>Try another random project →</button></div>}
      <div className="curated-grid">{selection.map(repository => <article className="curated-card" key={repository.id}><div className="curated-card-top"><span className="repo-source-mark compact">GH</span><div><small>{repository.category.toUpperCase()}</small><h3>{repository.fullName}</h3></div><span className={`difficulty-dot difficulty-${repository.difficulty.toLowerCase()}`}>{repository.difficulty}</span></div><p>{repository.description}</p><div className="curated-card-meta"><span><small>FOCUS</small><b>{repository.focus}</b></span><span><small>SOURCE</small><b>{Math.max(1, Math.round(repository.sizeKb / 1024))} MB</b></span><span><small>LICENSE</small><b>{repository.license}</b></span></div><div className="curated-card-actions"><button className="button button-dark button-small" onClick={() => void begin(repository)} disabled={Boolean(working)}>{working === repository.id ? "Analyzing project…" : "Use this repository →"}</button><a className="text-link" href={repository.url} target="_blank" rel="noreferrer">View on GitHub ↗</a></div></article>)}</div>
      {!selection.length && <div className="panel empty-state"><span className="step-icon">0</span><h3>No projects match that filter</h3><p>Clear the search or select another category to refill the shelf.</p><button className="button button-blue" onClick={() => { setQuery(""); setCategory("All"); refreshSelection(curatedRepositories); }}>Reset catalog</button></div>}
      <div className="curated-library-footer"><button className="button button-blue" onClick={() => refreshSelection()} disabled={Boolean(working)}>Shuffle 12 more projects →</button><p>Catalog snapshot curated July 16, 2026. Repository availability and licenses remain controlled by their maintainers.</p></div>
    </section>
  </main>;
}
