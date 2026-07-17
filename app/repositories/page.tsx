import Link from "next/link";
import GitHubImportCard from "./GitHubImportCard";
import LocalUploadCard from "./LocalUploadCard";
import { CURATED_REPOSITORY_COUNT } from "../../src/repositories/curated-catalog";
import { getAuthenticatedUser, signInPath } from "../auth";
import { listGitHubRepositoryCatalog } from "../../src/auth/auth-service";

export const dynamic = "force-dynamic";

export default async function Repositories() {
  const user = await getAuthenticatedUser();
  const connectedRepositories = user?.provider === "github" ? await listGitHubRepositoryCatalog(user.email, user.displayName) : [];
  return <main className="app-page repositories-simple-page">
    <header className="repositories-simple-header"><h1>Add a repository</h1><p>Choose where your code comes from. Your original repository stays untouched.</p></header>
    <section className="repository-entry-list" aria-label="Choose a repository source">
      {user ? <GitHubImportCard connectedRepositories={connectedRepositories} /> : <article className="repo-card repository-entry-card repository-account-gate"><div><h2>Import from GitHub</h2><p>Paste a public repository URL after signing in.</p></div><div><p>An account keeps imported code attached to the right workspace.</p><Link className="button button-dark" href={signInPath("/repositories")}>Sign in to import</Link></div></article>}
      {user ? <LocalUploadCard /> : <article className="repo-card repository-entry-card repository-account-gate"><div><h2>Import from computer</h2><p>Upload a project folder or ZIP after signing in.</p></div><div><p>Your account controls access to the filtered source snapshot.</p><Link className="button button-dark" href={signInPath("/repositories")}>Sign in to upload</Link></div></article>}
      <article className="repo-card repository-entry-card random-repository-card">
        <div><h2>Random GitHub repo</h2><p>Practice with one of {CURATED_REPOSITORY_COUNT} public projects.</p></div>
        <Link className="button button-dark" href="/repositories/curated">Choose a repo</Link>
      </article>
    </section>
  </main>;
}
