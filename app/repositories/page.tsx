import Link from "next/link";
import GitHubImportCard from "./GitHubImportCard";
import LocalUploadCard from "./LocalUploadCard";
import { CURATED_REPOSITORY_COUNT } from "../../src/repositories/curated-catalog";

export default function Repositories() {
  return <main className="app-page repositories-simple-page">
    <header className="repositories-simple-header"><p className="eyebrow">REPOSITORIES</p><h1>Bring your code.</h1><p>Choose one way to start. RepoRehearsal analyzes a safe copy and leaves the original untouched.</p></header>
    <section className="repository-entry-grid" aria-label="Choose a repository source">
      <GitHubImportCard />
      <LocalUploadCard />
      <article className="repo-card repository-entry-card random-repository-card">
        <span className="repository-entry-number">03</span>
        <div><p className="eyebrow">RANDOM GITHUB REPOSITORIES</p><h2>Surprise me</h2><p>Pick from {CURATED_REPOSITORY_COUNT} public TypeScript projects and start with an unfamiliar codebase.</p></div>
        <Link className="button button-dark" href="/repositories/curated">Browse random repositories →</Link>
      </article>
    </section>
  </main>;
}
