import Link from "next/link";

const steps = [
  ["I", "Map the repository", "Identify services, routes, migrations, tests, and reliability risks."],
  ["II", "Break an isolated copy", "Inject one deterministic fault after the clean baseline passes."],
  ["III", "Investigate & repair", "Use real evidence, make the smallest repair, and verify recovery."],
];

export default function About() {
  return <main className="about-spec">
    <section className="about-hero rr-container"><p>ABOUT</p><h1>We think you should meet the incident before it meets you.</h1><span>Realistic, safe practice builds the judgment required between a broken signal and a verified recovery.</span></section>
    <section className="about-mission"><p>Production failures are rarely solved by recalling a syntax trick. Engineers have to interpret incomplete signals, build an evidence trail, repair the smallest responsible boundary, and prove the system recovered.</p><p>RepoRehearsal creates that practice loop without asking anyone to learn in production. Every incident runs against a temporary copy with a known failure contract and deterministic validation.</p><blockquote>Practice the evidence-driven work between “something is broken” and “we know it is safe.”</blockquote></section>
    <section className="principles-spec"><div className="rr-container spec-card-grid"><article><h4>Deterministic, not random</h4><p>Every challenge has a known root cause, evidence path, and validation contract.</p></article><article><h4>Safe by construction</h4><p>Temporary workspaces, redacted secrets, and allowlisted commands protect original source.</p></article><article><h4>Scored, so you improve</h4><p>Diagnosis, investigation, repair, verification, and prevention become measurable signals.</p></article></div></section>
    <div className="about-image rr-container" aria-label="RepoRehearsal operating principle"><span>Evidence</span><i aria-hidden="true" /><strong>Practice before production</strong><i aria-hidden="true" /><span>Recovery</span></div>
    <section className="steps-band"><div className="rr-container"><div className="center-heading"><h2>From repository to rehearsal</h2></div><div className="spec-card-grid">{steps.map(([number,title,copy])=><article key={number}><span>{number}</span><h4>{title}</h4><p>{copy}</p></article>)}</div></div></section>
    <section className="closing-cta rr-container"><h2>Practice the part of engineering tutorials skip.</h2><Link className="button button-blue" href="/rehearsals/new">Start a rehearsal</Link></section>
  </main>;
}
