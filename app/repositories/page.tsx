import Link from "next/link";
import GitHubImportCard from "./GitHubImportCard";

export default function Repositories() {
  return <main className="app-page">
    <div className="page-title-row"><div><p className="eyebrow">REPOSITORIES</p><h1>Choose a codebase</h1><p>Use the complete billing service or analyze a compatible public GitHub repository.</p></div></div>
    <div className="repo-grid">
      <article className="repo-card"><span className="badge badge-green">READY</span><h2>RepoRehearsal Billing Demo</h2><p>A prepared Express service with realistic accounts, migrations, health checks, tests, and three controlled incident templates.</p><div className="tag-row">{["TypeScript", "Express", "PostgreSQL", "Prisma", "Vitest", "Docker"].map(item => <span className="tag" key={item}>{item}</span>)}</div><div className="repo-meta"><div><small>SERVICES</small><b>1</b></div><div><small>TEST FILES</small><b>2</b></div><div><small>RISK AREAS</small><b>2</b></div></div><div className="actions"><Link className="button button-dark" href="/repositories/billing-demo">View analysis →</Link><Link className="button button-ghost" href="/rehearsals/new">Use repository</Link></div></article>
      <article className="repo-card repository-safety-card"><span className="badge badge-blue">READ-ONLY</span><h2>Repository safety boundary</h2><p>Every source is treated as untrusted input. Analysis reads only limited metadata, and rehearsal work happens in a temporary isolated copy.</p><div className="safety-list"><span>✓ Original source is never modified</span><span>✓ Secrets and environment files are excluded</span><span>✓ Paths, file counts, and sizes are validated</span><span>✓ Temporary workspaces expire automatically</span></div><Link className="text-link" href="/privacy">Review security and privacy →</Link></article>
    </div>
    <div style={{ marginTop: 18 }}><GitHubImportCard /></div>
  </main>;
}
