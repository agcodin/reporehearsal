"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type SampleRepository = {
  id: string;
  language: string;
  name: string;
  description: string;
  tags: readonly string[];
};

export default function SampleRepositoryCatalog({ samples }: { samples: readonly SampleRepository[] }) {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("All");
  const languages = useMemo(() => ["All", ...new Set(samples.map(sample => sample.language))], [samples]);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return samples.filter(sample =>
      (language === "All" || sample.language === language) &&
      (!search || `${sample.name} ${sample.description} ${sample.language} ${sample.tags.join(" ")}`.toLowerCase().includes(search)),
    );
  }, [language, query, samples]);

  return <>
    <div className="repo-toolbar">
      <label>⌕<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search repositories" aria-label="Search repositories" /></label>
      <div aria-label="Filter repositories by language">{languages.map(item => <button type="button" className={language === item ? "active" : ""} aria-pressed={language === item} onClick={() => setLanguage(item)} key={item}>{item}</button>)}</div>
    </div>
    <p className="section-overline">CURATED SAMPLES</p>
    {filtered.length ? <section className="sample-grid">{filtered.map(sample => <article key={sample.id}>
      <header><i /><b>{sample.name}</b><small>{sample.language}</small></header>
      <p>{sample.description}</p>
      <footer>{sample.tags.map(tag => <span key={tag}>{tag}</span>)}<Link className="button button-ghost" href={`/rehearsals/new?repositoryId=${encodeURIComponent(sample.id)}&generated=1&repositoryName=${encodeURIComponent(sample.name)}&language=${encodeURIComponent(sample.language)}`}>Rehearse →</Link></footer>
    </article>)}</section> : <div className="repository-filter-empty"><b>No sample repositories match.</b><button type="button" className="text-link" onClick={() => { setQuery(""); setLanguage("All"); }}>Clear filters</button></div>}
  </>;
}
