import Link from "next/link";
import { Suspense } from "react";
import { chatGPTSignInPath, getChatGPTUser } from "../chatgpt-auth";
import { getAccountDashboard } from "../../src/accounts/account-service";

export const dynamic = "force-dynamic";
function metric(value: number | null, suffix = "") { return value === null ? "—" : `${value}${suffix}`; }

async function DashboardContent() {
  const user = await getChatGPTUser();
  if (!user) {
    return <main className="app-page">
      <div className="page-title-row"><div><p className="eyebrow">OPTIONAL ACCOUNT</p><h1>Your incident readiness</h1><p>Practice cases stay public. Sign in only when you want a personal history, saved repositories, and reusable preferences.</p></div><Link className="button button-dark" href={chatGPTSignInPath("/dashboard")}>Sign in to your dashboard →</Link></div>
      <div className="account-grid">
        <section className="panel empty-state"><span className="step-icon">01</span><h2>No account required to practice</h2><p>Try any of the four incident cases without creating an account. Your personal scores and activity appear here after you sign in.</p><Link className="button button-blue" href="/rehearsals/new">Choose a practice case →</Link></section>
        <aside className="panel repository-safety-card"><span className="panel-label">BRING YOUR OWN CODE</span><h2>Use a repository publicly</h2><p>Paste a public GitHub URL or upload a codebase from your computer. Anonymous snapshots are temporary and the original repository is never modified.</p><Link className="text-link" href="/repositories">Open repository options →</Link></aside>
      </div>
    </main>;
  }
  const data = await getAccountDashboard(user.email, user.displayName);
  const firstName = user.fullName?.split(" ")[0] ?? user.email.split("@")[0];
  return <main className="app-page">
    <div className="page-title-row"><div><p className="eyebrow">WELCOME BACK, {firstName.toUpperCase()}</p><h1>Incident readiness</h1><p>{data.metrics.completed ? `${data.metrics.completed} completed rehearsal${data.metrics.completed === 1 ? "" : "s"}. Your history is saved to this account.` : "Your readiness profile begins with your first completed rehearsal."}</p></div><Link className="button button-dark" href="/rehearsals/new">Start new rehearsal →</Link></div>
    <section className="grid-4"><div className="stat-card"><small>AVERAGE SCORE</small><strong>{metric(data.metrics.averageScore)}</strong><span className="delta">Completed rehearsals</span></div><div className="stat-card"><small>AVG. DIAGNOSIS</small><strong>{metric(data.metrics.averageDuration, "m")}</strong><span className="delta">Measured after submission</span></div><div className="stat-card"><small>COMPLETION RATE</small><strong>{metric(data.metrics.completionRate, "%")}</strong><span className="delta">{data.rehearsals.length} submitted</span></div><div className="stat-card"><small>SAVED REPOSITORIES</small><strong>{data.repositories.length}</strong><span className="delta">Reusable snapshots</span></div></section>
    <div className="dashboard-grid"><section className="panel"><span className="panel-label">REHEARSAL HISTORY</span><h2>Your investigations</h2>{data.rehearsals.length ? data.rehearsals.slice(0, 6).map(session => <div className="session-row" key={session.id}><div><b>{session.incidentName}</b><p>{session.repositoryName} · {new Date(session.completedAt).toLocaleDateString()}</p></div><span>{session.durationMinutes}m</span><strong className="score-ring">{session.score}</strong><span>{session.status === "COMPLETED" ? "✓" : "×"}</span></div>) : <div className="empty-state"><span className="step-icon">01</span><h3>No rehearsals yet</h3><p>Complete an incident and its verified score, duration, and hints will appear here.</p><Link className="button button-blue" href="/rehearsals/new">Choose your first incident →</Link></div>}
      <div className="saved-repositories"><div className="saved-repositories-head"><div><span className="panel-label">SAVED REPOSITORIES</span><h2>Your codebases</h2></div><Link className="text-link" href="/repositories">Add repository →</Link></div>{data.repositories.length ? data.repositories.slice(0, 5).map(repository => <div className="repository-row" key={repository.id}><span className="repo-source-mark compact">{repository.source === "UPLOAD" ? "LOCAL" : "GH"}</span><div><b>{repository.name}</b><p>{repository.displayRef} · {repository.language} · {repository.fileCount.toLocaleString()} files</p></div><span>{new Date(repository.updatedAt).toLocaleDateString()}</span></div>) : <p className="muted-copy">Upload a folder or ZIP, or paste a public GitHub URL. Safe signed-in snapshots can be reused for future rehearsals.</p>}</div>
    </section><aside><section className="panel recommend"><span className="panel-label">RECOMMENDED NEXT</span><h2>{data.metrics.completed ? "Container host mismatch" : "Required field migration"}</h2><span className="badge badge-red">{data.metrics.completed ? "BEGINNER" : "INTERMEDIATE"}</span><p>{data.metrics.completed ? "Practice reasoning across service network boundaries." : "Build an evidence trail through logs, data, migration history, and validation."}</p><Link className="button button-accent" href="/rehearsals/new">Start recommended exercise →</Link></section><section className="panel" style={{ marginTop: 18 }}><span className="panel-label">ACCOUNT DEFAULTS</span><h2>How you rehearse</h2><p><b>Mode</b><br />{data.profile.defaultMode.toLowerCase().replace(/^./, value => value.toUpperCase())}</p><p><b>Time limit</b><br />{data.profile.defaultTimeLimit} minutes</p><Link className="text-link" href="/account">Update account settings →</Link></section></aside></div>
  </main>;
}

export default function Dashboard() { return <Suspense fallback={<main className="app-page"><div className="account-loading"><span className="pulse" /> Loading your readiness profile…</div></main>}><DashboardContent /></Suspense>; }
