import Link from "next/link";
import GitHubImportCard from "./GitHubImportCard";

export default function Repositories() {
  return <main className="app-page">
    <div className="page-title-row"><div><p className="eyebrow">REPOSITORIES</p><h1>Choose a codebase</h1><p>Use the complete demo, analyze a public GitHub repository, or upload a supported TypeScript project.</p></div></div>
    <div className="repo-grid">
      <article className="repo-card"><span className="badge badge-green">READY</span><h2>RepoRehearsal Billing Demo</h2><p>A prepared Express service with realistic accounts, migrations, health checks, tests, and three controlled incident templates.</p><div className="tag-row">{["TypeScript", "Express", "PostgreSQL", "Prisma", "Vitest", "Docker"].map(item => <span className="tag" key={item}>{item}</span>)}</div><div className="repo-meta"><div><small>SERVICES</small><b>1</b></div><div><small>TEST FILES</small><b>2</b></div><div><small>RISK AREAS</small><b>2</b></div></div><div className="actions"><Link className="button button-dark" href="/repositories/billing-demo">View analysis →</Link><Link className="button button-ghost" href="/rehearsals/new">Use repository</Link></div></article>
      <article className="repo-card upload-card"><div><div className="step-icon" style={{ margin: "auto" }}>↑</div><h2>Upload supported repository</h2><p>ZIP up to 20 MB · TypeScript + Express + Prisma</p><button className="button button-ghost" type="button" title="Upload validation is included in the production adapter">Choose ZIP archive</button><p><small>Absolute paths, symlinks, nested archives, and unsupported binaries are rejected.</small></p></div></article>
    </div>
    <div style={{ marginTop: 18 }}><GitHubImportCard /></div>
  </main>;
}
