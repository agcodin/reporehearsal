"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { usePlan } from "../components/PlanProvider";
import { assignmentStartPath } from "../../src/team/assignment-link";
import { incidents as incidentTemplates } from "../../src/data";

type Member = { id: string; email: string; displayName: string; role: "OWNER" | "MEMBER"; status: "ACTIVE" | "INVITED"; invitedAt: string; joinedAt: string | null };
type Assignment = { id: string; repositoryId: string; repositoryName: string; incidentTemplateId: string; incidentName: string; assignedToEmail: string; createdAt: string };
type Repository = { id: string; name: string; displayRef: string; language: string; fileCount: number };
type Result = { id: string; memberEmail: string; displayName: string; incidentName: string; repositoryName: string; score: number; durationMinutes: number; status: "COMPLETED" | "UNRESOLVED"; completedAt: string };
type TeamData = { viewer: { role: "OWNER" | "MEMBER"; email: string; canManage: boolean }; team: { id: string; name: string; seatLimit: number; seatsUsed: number }; members: Member[]; assignments: Assignment[]; repositories: Repository[]; results: Result[] };

const incidents = incidentTemplates.map(item => [item.id, item.name] as const);

export default function TeamWorkspace() {
  const { activePlan, ready, includes, activate } = usePlan();
  const [data, setData] = useState<TeamData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [email, setEmail] = useState("");
  const [repositoryId, setRepositoryId] = useState("challenge-of-the-day");
  const [incidentId, setIncidentId] = useState(incidents[0][0]);
  const [assignee, setAssignee] = useState("all");
  const [leftTeam, setLeftTeam] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    fetch("/api/team", { headers: { "x-reporehearsal-plan": activePlan } }).then(async response => {
      const body = await response.json();
      if (response.status === 404) { if (active) setData(null); return; }
      if (!response.ok) throw Object.assign(new Error(body.error?.message ?? "The team workspace could not be loaded."), { status: response.status });
      if (active) setData(body);
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "The team workspace could not be loaded."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activePlan, ready]);

  async function act(payload: Record<string, string>, key: string) {
    setBusy(key); setError("");
    try {
      const response = await fetch("/api/team", { method: "POST", headers: { "content-type": "application/json", "x-reporehearsal-plan": activePlan }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "The team could not be updated.");
      if (payload.action === "leave-team") { setData(null); setLeftTeam(true); }
      else setData(body);
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The team could not be updated."); return false; }
    finally { setBusy(""); }
  }

  async function invite(event: FormEvent) {
    event.preventDefault();
    if (await act({ action: "invite", email }, "invite")) setEmail("");
  }

  async function assign(event: FormEvent) {
    event.preventDefault();
    const incident = incidents.find(item => item[0] === incidentId) ?? incidents[0];
    await act({ action: "create-assignment", repositoryId, incidentTemplateId: incident[0], incidentName: incident[1], assignedToEmail: assignee }, "assignment");
  }

  if (!ready || loading) return <main className="app-page"><div className="account-loading"><span className="pulse" /> Loading team workspace…</div></main>;
  if (!data && !includes("TEAM") && !error) return <main className="app-page"><section className="feature-gate"><span className="badge badge-blue">TEAM FEATURE</span><h1>Manage practice across a five-person team.</h1><p>Activate the Team preview to invite members, assign repositories, and review verified results. People invited by a manager can open this page without upgrading.</p><div className="actions"><button className="button button-blue" onClick={() => activate("TEAM")}>Activate Team preview →</button><Link className="button button-ghost" href="/pricing">Compare plans</Link></div></section></main>;
  if (!data) return <main className="app-page"><section className="team-auth-required"><h1>{leftTeam ? "You left the team" : "Sign in to open your team"}</h1><p>{leftTeam ? "Your membership and access to its assigned repositories have been removed." : error || "Team invitations, assignments, and results are tied to your account."}</p>{leftTeam ? <Link className="button button-dark" href="/dashboard">Return to dashboard →</Link> : <Link className="button button-dark" href="/signin?return_to=%2Fteam">Sign in →</Link>}</section></main>;

  const invitedMembers = data.members.filter(member => member.role === "MEMBER");
  const activeMembers = invitedMembers.filter(member => member.status === "ACTIVE");
  if (!data.viewer.canManage) return <main className="app-page team-dashboard team-member-dashboard">
    <header className="team-dashboard-header"><div><h1>{data.team.name}</h1><p>Your assigned repository challenges and submitted scores.</p></div><button className="button button-ghost" onClick={() => { if (window.confirm(`Leave ${data.team.name}? You will lose access to its assigned repositories.`)) void act({ action: "leave-team", teamId: data.team.id }, "leave"); }} disabled={busy === "leave"}>{busy === "leave" ? "Leaving…" : "Leave team"}</button></header>
    {error && <div className="team-error" role="alert">{error}</div>}
    <section className="team-section"><div className="team-section-heading"><div><h2>Assigned challenges</h2><p>These challenges were assigned to you by the team manager.</p></div></div>{data.assignments.length ? <div className="member-assignment-list">{data.assignments.map(item => <article key={item.id}><div><b>{item.repositoryName}</b><span>{item.incidentName} · assigned {new Date(item.createdAt).toLocaleDateString()}</span></div><Link className="button button-dark" href={assignmentStartPath(item.repositoryId,item.incidentTemplateId)}>Start challenge</Link></article>)}</div> : <p className="team-empty">Your manager has not assigned a challenge yet.</p>}</section>
    <section className="team-section"><div className="team-section-heading"><div><h2>Your results</h2><p>Only you and the team manager can see this score history.</p></div></div>{data.results.length ? <div className="team-table-wrap"><table className="team-table results-table"><thead><tr><th>Repository</th><th>Incident</th><th>Score</th><th>Time</th><th>Submitted</th></tr></thead><tbody>{data.results.map(result => <tr key={result.id}><td><b>{result.repositoryName}</b></td><td>{result.incidentName}</td><td><strong className={result.score < 0 ? "negative-score" : ""}>{result.score}</strong></td><td>{result.durationMinutes}m</td><td>{new Date(result.completedAt).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <p className="team-empty">Your submitted challenge scores will appear here.</p>}</section>
  </main>;
  return <main className="app-page team-dashboard">
    <header className="team-dashboard-header"><div><h1>{data.team.name}</h1><p>Invite up to five people, give them repository work, and review their submitted results.</p></div><div className="team-seat-count"><b>{data.team.seatsUsed} / {data.team.seatLimit}</b><span>member seats used</span></div></header>
    {error && <div className="team-error" role="alert">{error}</div>}
    <nav className="team-section-nav" aria-label="Team dashboard sections"><a href="#members">Members</a><a href="#assignments">Assignments</a><a href="#results">Results</a><Link href="/team/studio">Incident studio</Link></nav>

    <section className="team-section" id="members"><div className="team-section-heading"><div><h2>Members</h2><p>{activeMembers.length} active · {invitedMembers.length - activeMembers.length} awaiting account sign-in</p></div><form className="team-invite-form" onSubmit={invite}><label htmlFor="team-email">Invite by email</label><div><input id="team-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="engineer@company.com" required disabled={data.team.seatsUsed >= data.team.seatLimit} /><button className="button button-dark" disabled={busy === "invite" || data.team.seatsUsed >= data.team.seatLimit}>{busy === "invite" ? "Inviting…" : "Invite"}</button></div></form></div>
      <div className="team-table-wrap"><table className="team-table"><thead><tr><th>Person</th><th>Role</th><th>Status</th><th>Joined</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{data.members.map(member => <tr key={member.id}><td><b>{member.displayName}</b><span>{member.email}</span></td><td>{member.role === "OWNER" ? "Subscription holder" : "Member"}</td><td><span className={`team-status ${member.status.toLowerCase()}`}>{member.status === "ACTIVE" ? "Active" : "Invited"}</span></td><td>{member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "—"}</td><td>{member.role === "MEMBER" && <button className="text-link" onClick={() => act({ action: "remove-member", memberId: member.id }, member.id)} disabled={busy === member.id}>Remove</button>}</td></tr>)}</tbody></table></div>
      <p className="team-help">Invitations reserve a seat immediately. When that email signs in to RepoRehearsal, the member becomes active automatically.</p>
    </section>

    <section className="team-section" id="assignments"><div className="team-section-heading"><div><h2>Assignments</h2><p>Assign one repository—or the entire saved library—to everyone or one member.</p></div></div>
      <form className="team-assignment-form" onSubmit={assign}><label>Repository<select value={repositoryId} onChange={event => setRepositoryId(event.target.value)}><option value="challenge-of-the-day">Challenge of the Day</option>{data.repositories.map(repository => <option value={repository.id} key={repository.id}>{repository.name} · {repository.language}</option>)}</select></label><label>Incident<select value={incidentId} onChange={event => setIncidentId(event.target.value as typeof incidentId)} disabled={repositoryId === "challenge-of-the-day"}>{repositoryId === "challenge-of-the-day" && <option value={incidentId}>Set by today’s challenge</option>}{repositoryId !== "challenge-of-the-day" && incidents.map(item => <option value={item[0]} key={item[0]}>{item[1]}</option>)}</select></label><label>Assign to<select value={assignee} onChange={event => setAssignee(event.target.value)}><option value="all">Everyone</option>{invitedMembers.map(member => <option value={member.email} key={member.id}>{member.displayName}</option>)}</select></label><button className="button button-dark" disabled={busy === "assignment" || !invitedMembers.length}>{busy === "assignment" ? "Assigning…" : "Create assignment"}</button></form>
      {data.assignments.length ? <div className="team-table-wrap"><table className="team-table assignment-table"><thead><tr><th>Repository</th><th>Incident</th><th>Assigned to</th><th>Created</th></tr></thead><tbody>{data.assignments.map(item => <tr key={item.id}><td><b>{item.repositoryName}</b></td><td>{item.incidentName}</td><td>{item.assignedToEmail === "all" ? "Everyone" : item.assignedToEmail}</td><td>{new Date(item.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <p className="team-empty">No assignments yet. Invite a member, then create the first assignment.</p>}
    </section>

    <section className="team-section" id="results"><div className="team-section-heading"><div><h2>Results</h2><p>Verified submissions from the owner and active team members.</p></div></div>
      {data.results.length ? <div className="team-table-wrap"><table className="team-table results-table"><thead><tr><th>Member</th><th>Repository</th><th>Incident</th><th>Score</th><th>Time</th><th>Submitted</th></tr></thead><tbody>{data.results.map(result => <tr key={result.id}><td><b>{result.displayName}</b><span>{result.memberEmail}</span></td><td>{result.repositoryName}</td><td>{result.incidentName}</td><td><strong className={result.score < 0 ? "negative-score" : ""}>{result.score}</strong></td><td>{result.durationMinutes}m</td><td>{new Date(result.completedAt).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <p className="team-empty">Results appear here after a team member submits a rehearsal.</p>}
    </section>
  </main>;
}
