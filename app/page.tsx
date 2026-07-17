import Link from "next/link";

const steps = [
  ["01", "Map the repository", "We identify services, routes, migrations, tests, and reliability risks before selecting an exercise."],
  ["02", "Break an isolated copy", "A deterministic fault is injected only after the clean baseline passes. Your source stays untouched."],
  ["03", "Investigate, repair, learn", "Use code, logs, tests, database evidence, and health checks. Then receive a scored after-action report."],
];

export default function Landing() {
  return <main>
    <section className="hero page-pad">
      <div className="hero-copy"><h1>Practice debugging real production failures.</h1><p className="lede">RepoRehearsal turns a safe copy of a software repository into a focused incident. Investigate the evidence, repair the fault, and get a clear score.</p><div className="actions"><Link className="button button-dark" href="/rehearsals/new">Start a rehearsal</Link><Link className="button button-ghost" href="/repositories">Use your repository</Link></div><p className="microcopy">No private repository or API key required.</p></div>
      <div className="incident-card" aria-label="Example incident report"><div className="window-bar"><b>Incident briefing</b><code>14:14 UTC</code></div><div className="incident-body"><div className="sev-row"><span className="badge badge-red">SEV-2</span><span>Billing service</span></div><h2>New accounts cannot open billing</h2><p>HTTP 500 errors began shortly after a database migration. Existing customers appear unaffected.</p><div className="health-row"><span>billing-api</span><b className="bad">Degraded</b></div><div className="health-row"><span>authentication</span><b className="good">Healthy</b></div><div className="health-row"><span>dashboard</span><b className="good">Healthy</b></div><div className="log-line"><code>14:14:09</code><span>error</span><p>GET /billing → 500<br/><b>request_id=req_8f2a</b></p></div></div><div className="incident-footer"><strong>Objective: find the root cause and repair it safely.</strong></div></div>
    </section>
    <section className="trust-strip"><span>Works with</span><b>TypeScript</b><b>Express</b><b>PostgreSQL</b><b>Prisma</b><b>Vitest</b><b>Docker</b></section>
    <section className="how page-pad"><div className="section-heading"><h2>From repository to scored rehearsal</h2><p>Practice the evidence-driven work between “something is broken” and “we know it is safe.”</p></div><div className="steps">{steps.map(([n,t,d])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div></section>
    <section className="incident-types page-pad"><div><h2>Choose the kind of failure</h2><p>Each case has a known root cause, observable evidence, a safe repair path, and deterministic validation.</p></div><div className="type-list"><article><span>DB</span><div><b>Database migration</b><p>Unsafe schema transitions, incomplete backfills, and mismatched record creation paths.</p></div></article><article><span>CFG</span><div><b>Configuration failure</b><p>Container host mismatches and environment-specific connection errors.</p></div></article><article><span>API</span><div><b>External dependency</b><p>Provider schema drift, partial responses, and timeout handling.</p></div></article></div></section>
    <section className="privacy-band"><h2>Your repository stays yours.</h2><p>Every exercise runs against a temporary copy. Secrets are redacted, commands are allowlisted, workspaces expire, and the original repository is never modified.</p><Link className="text-link" href="/privacy">Security and privacy details</Link></section>
  </main>;
}
