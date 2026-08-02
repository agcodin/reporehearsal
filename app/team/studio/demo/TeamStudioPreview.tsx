"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type Step = 1 | 2 | 3;

const reviewedDiff = `- return response.json()
+ if (!response.ok) throw new ProviderError(response.status)
+ return response.json()`;

export default function TeamStudioPreview() {
  const [step, setStep] = useState<Step>(1);
  const [source, setSource] = useState("https://github.com/example/sync-service/pull/184");
  const [title, setTitle] = useState("Handle upstream provider failures before parsing");
  const [signal, setSignal] = useState("Provider sync fails only when the upstream service returns 503.");
  const [evidence, setEvidence] = useState("503 response status\nPayload parser error\nGrowing retry queue");
  const [validation, setValidation] = useState("Non-success responses never reach success-payload parsing, and the retry path remains intact.");
  const [invite, setInvite] = useState("teammate@example.com");
  const [invited, setInvited] = useState(false);
  const [assigned, setAssigned] = useState(false);

  function importSource(event: FormEvent) {
    event.preventDefault();
    setStep(2);
  }

  function approve(event: FormEvent) {
    event.preventDefault();
    setStep(3);
  }

  function inviteMember(event: FormEvent) {
    event.preventDefault();
    setInvited(true);
  }

  return <main className="studio-preview app-page">
    <header className="studio-preview-header">
      <div>
        <p className="not-found-code">INTERACTIVE TEAM PREVIEW</p>
        <h1>Build and assign a safe incident.</h1>
        <p>Try the complete manager workflow with sample data. Nothing is uploaded, saved, or sent from this preview.</p>
      </div>
      <div className="actions"><Link className="button button-dark" href="/signin?return_to=%2Fteam%2Fstudio">Use Team with your repository →</Link><Link className="button button-ghost" href="/pricing">See Team pricing</Link></div>
    </header>

    <ol className="studio-preview-steps" aria-label="Preview progress">
      <li className={step === 1 ? "active" : step > 1 ? "complete" : ""}><b>1</b><span>Import change</span></li>
      <li className={step === 2 ? "active" : step > 2 ? "complete" : ""}><b>2</b><span>Review contract</span></li>
      <li className={step === 3 ? "active" : ""}><b>3</b><span>Invite and assign</span></li>
    </ol>

    {step === 1 && <section className="studio-preview-panel">
      <div className="studio-preview-copy"><h2>Import a reviewed change</h2><p>In Team, a manager can import a public GitHub pull request or paste a focused diff. The repaired lines become the known-good baseline; removed lines become the reversible fault.</p><ul><li>The source repository is never modified.</li><li>Only the selected change is used to draft the incident.</li><li>A manager must approve the contract before assignment.</li></ul></div>
      <form onSubmit={importSource} className="studio-preview-form"><label htmlFor="preview-pr">Public pull request URL</label><input id="preview-pr" type="url" value={source} onChange={event => setSource(event.target.value)} required /><label htmlFor="preview-diff">Detected change</label><textarea id="preview-diff" className="code-contract" value={reviewedDiff} readOnly rows={5}/><button className="button button-dark">Create review draft →</button><small>Demo only. No request is made to GitHub.</small></form>
    </section>}

    {step === 2 && <section className="studio-preview-panel">
      <div className="studio-preview-copy"><h2>Approve the incident contract</h2><p>Edit the generated draft just as a Team manager would. These fields define what the learner sees, what evidence exists, and exactly how the repair is validated.</p><dl><div><dt>Fault injected</dt><dd>The upstream response is parsed before its status is checked.</dd></div><div><dt>Target file</dt><dd><code>src/providers/client.ts</code></dd></div><div><dt>Safety</dt><dd>Isolated copy, blocked outbound network, deterministic checks.</dd></div></dl></div>
      <form onSubmit={approve} className="studio-preview-form"><label htmlFor="preview-title">Incident title</label><input id="preview-title" value={title} onChange={event => setTitle(event.target.value)} required/><label htmlFor="preview-signal">Initial production signal</label><textarea id="preview-signal" value={signal} onChange={event => setSignal(event.target.value)} required/><label htmlFor="preview-evidence">Required evidence</label><textarea id="preview-evidence" value={evidence} onChange={event => setEvidence(event.target.value)} required/><label htmlFor="preview-validation">Validation contract</label><textarea id="preview-validation" value={validation} onChange={event => setValidation(event.target.value)} required/><div className="studio-preview-actions"><button type="button" className="button button-ghost" onClick={() => setStep(1)}>Back</button><button className="button button-dark">Approve incident →</button></div></form>
    </section>}

    {step === 3 && <section className="studio-preview-panel">
      <div className="studio-preview-copy"><h2>Invite and assign</h2><p>Team managers can invite up to five people, assign a published incident, and review each submitted score, time, evidence trail, and grading report.</p><dl><div><dt>Approved incident</dt><dd>{title}</dd></div><div><dt>Repository</dt><dd>example/sync-service</dd></div><div><dt>Due</dt><dd>Friday · 5:00 PM</dd></div></dl></div>
      <div className="studio-preview-form">
        <form onSubmit={inviteMember}><label htmlFor="preview-email">Teammate email</label><div className="studio-inline-field"><input id="preview-email" type="email" value={invite} onChange={event => { setInvite(event.target.value); setInvited(false); }} required/><button className="button button-ghost">{invited ? "Invited ✓" : "Send invite"}</button></div></form>
        <label htmlFor="preview-assignee">Assign to</label><select id="preview-assignee" disabled={!invited}><option>{invited ? invite : "Invite a teammate first"}</option></select>
        <label htmlFor="preview-message">Manager note</label><textarea id="preview-message" defaultValue="Investigate the customer-facing signal before changing code. Include the verification steps in your handoff."/>
        <button className="button button-dark" disabled={!invited || assigned} onClick={() => setAssigned(true)}>{assigned ? "Challenge assigned ✓" : "Assign challenge →"}</button>
        {assigned && <div className="studio-preview-success" role="status"><b>Assignment ready</b><p>{invite} would receive the challenge. Their first submission, score, time, and report would appear in the Team dashboard.</p><Link href="/signin?return_to=%2Fteam%2Fstudio">Sign in to create a real assignment →</Link></div>}
        <button type="button" className="text-link" onClick={() => { setStep(1); setInvited(false); setAssigned(false); }}>Restart preview</button>
      </div>
    </section>}
  </main>;
}
