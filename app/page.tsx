import Link from "next/link";

const steps = [
  ["01", "Map the repository", "Identify services, routes, migrations, tests, and reliability risks before selecting an exercise."],
  ["02", "Break an isolated copy", "Inject a deterministic fault only after the clean baseline passes. Your source stays untouched."],
  ["03", "Investigate & repair", "Use code, logs, tests, database evidence, and health checks. Then receive a scored report."],
];
const languages = ["TypeScript", "JavaScript", "Python", "Java", "C", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Kotlin", "Swift", "Scala"];

export default function Landing() {
  return <main className="home-page">
    <section className="home-hero rr-container"><div className="announcement-chip"><i />Isolated sandbox · your source is never modified</div><h1>Practice debugging real production failures.</h1><p>Turn a safe copy of any repository into a focused incident. Investigate the evidence, repair the fault, and get a clear score.</p><div className="actions"><Link className="button button-blue" href="/rehearsals/new">Start a rehearsal</Link><Link className="button button-ghost" href="/repositories">Use your repository ↗</Link></div><small>No private repository or API key required.</small></section>
    <section className="briefing-wrap rr-container"><article className="incident-briefing"><header><div><span className="badge badge-red">SEV-2</span><b>Billing service</b></div><code>14:14 UTC</code></header><div className="briefing-body"><h3>New accounts cannot open billing</h3><p>HTTP 500 errors began shortly after a database migration. Existing customers appear unaffected.</p><div className="status-grid"><div className="status-tile degraded"><span>billing-api</span><b>Degraded</b></div><div className="status-tile healthy"><span>authentication</span><b>Healthy</b></div><div className="status-tile healthy"><span>dashboard</span><b>Healthy</b></div></div><pre><span>error</span>  GET /billing → 500   <i>request_id=req_8f2a</i></pre></div></article></section>
    <section className="steps-band"><div className="rr-container"><div className="center-heading"><h2>From repository to scored rehearsal</h2><p>The evidence-driven work between “something is broken” and “we know it is safe.”</p></div><div className="spec-card-grid">{steps.map(([number,title,copy]) => <article key={number}><span>{number}</span><h4>{title}</h4><p>{copy}</p></article>)}</div></div></section>
    <section className="failure-section rr-container"><div className="center-heading"><h2>Choose the kind of failure.</h2><p>Each case has a known root cause, observable evidence, a safe repair path, and deterministic validation.</p></div><div className="spec-card-grid"><article><code>DB</code><h4>Database migration</h4><p>Unsafe schema transitions, incomplete backfills, and mismatched record creation paths.</p></article><article><code>CFG</code><h4>Configuration failure</h4><p>Container host mismatches and environment-specific connection errors.</p></article><article><code>API</code><h4>External dependency</h4><p>Provider schema drift, partial responses, retry safety, and timeout handling.</p></article></div></section>
    <section className="language-section rr-container"><p>SUPPORTED LANGUAGES</p><div>{languages.map(language => <span key={language}>{language}</span>)}</div></section>
    <section className="closing-cta rr-container"><h2>Your repository stays yours.</h2><p>Temporary copies. Redacted secrets. Allowlisted commands. Expiring workspaces.</p><Link className="button button-dark" href="/rehearsals/new">Start a rehearsal</Link><Link className="text-link" href="/privacy">Security and privacy details →</Link></section>
  </main>;
}
