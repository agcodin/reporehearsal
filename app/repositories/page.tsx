import Link from "next/link";
import GitHubImportCard from "./GitHubImportCard";
import LocalUploadCard from "./LocalUploadCard";
import { CURATED_REPOSITORY_COUNT } from "../../src/repositories/curated-catalog";

export default function Repositories() {
  return <main className="app-page repositories-simple-page">
    <header className="repositories-simple-header"><h1>Add a repository</h1><p>Choose where your code comes from. Your original repository stays untouched.</p></header>
    <section className="repository-entry-list" aria-label="Choose a repository source">
      <GitHubImportCard />
      <LocalUploadCard />
      <article className="repo-card repository-entry-card random-repository-card">
        <div><h2>Random GitHub repo</h2><p>Practice with one of {CURATED_REPOSITORY_COUNT} public projects.</p></div>
        <Link className="button button-dark" href="/repositories/curated">Choose a repo</Link>
      </article>
    </section>
  </main>;
}
