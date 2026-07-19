import { env } from "cloudflare:workers";
import { ensureAccount, ensureAccountSchema } from "../accounts/account-service";
import type { AuthenticatedUser } from "../auth/auth-service";
import { dailyChallenge } from "../rehearsals/daily";

const TEAM_SEAT_LIMIT = 5;

type TeamRow = { id: string; name: string; owner_account_id: string; created_at: string };
type MemberRow = { id: string; email: string; display_name: string; role: "OWNER" | "MEMBER"; status: "ACTIVE" | "INVITED"; invited_at: string; joined_at: string | null };
type AssignmentRow = { id: string; repository_id: string; repository_name: string; incident_template_id: string; incident_name: string; assigned_to_email: string; created_at: string };
type ResultRow = { id: string; member_email: string; display_name: string; incident_name: string; repository_name: string; score: number; duration_minutes: number; status: "COMPLETED" | "UNRESOLVED"; completed_at: string };
type Viewer = { profileId: string; email: string; displayName: string };

function database(): D1Database {
  if (!env.DB) throw new Error("Team database binding is unavailable");
  return env.DB;
}

export class TeamServiceError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}

export async function ensureTeamSchema() {
  await ensureAccountSchema();
  const db = database();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY NOT NULL,
      owner_account_id TEXT NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY NOT NULL,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
      email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      invited_at TEXT NOT NULL,
      joined_at TEXT
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS team_members_team_email_unique ON team_members(team_id, email)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS team_assignments (
      id TEXT PRIMARY KEY NOT NULL,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      repository_id TEXT NOT NULL,
      repository_name TEXT NOT NULL,
      incident_template_id TEXT NOT NULL,
      incident_name TEXT NOT NULL,
      assigned_to_email TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS team_assignments_team_date_idx ON team_assignments(team_id, created_at DESC)"),
  ]);
}

async function viewer(user: { email: string; displayName: string }): Promise<Viewer> {
  await ensureTeamSchema();
  const profile = await ensureAccount(user.email, user.displayName);
  const now = new Date().toISOString();
  await database().prepare(`UPDATE team_members SET account_id = ?, display_name = ?, status = 'ACTIVE', joined_at = COALESCE(joined_at, ?)
    WHERE email = ? AND role = 'MEMBER'`).bind(profile.id, profile.displayName, now, profile.email).run();
  return { profileId: profile.id, email: profile.email, displayName: profile.displayName };
}

async function ownerTeam(user: AuthenticatedUser): Promise<TeamRow> {
  const profile = await viewer(user);
  const db = database(); const now = new Date().toISOString();
  await db.prepare("INSERT INTO teams (id, owner_account_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(owner_account_id) DO NOTHING")
    .bind(crypto.randomUUID(), profile.profileId, `${profile.displayName}'s team`, now, now).run();
  const team = await db.prepare("SELECT id, name, owner_account_id, created_at FROM teams WHERE owner_account_id = ?").bind(profile.profileId).first<TeamRow>();
  if (!team) throw new TeamServiceError("TEAM_NOT_FOUND", "The team workspace could not be created.", 500);
  await db.prepare(`INSERT INTO team_members (id, team_id, account_id, email, display_name, role, status, invited_at, joined_at)
    VALUES (?, ?, ?, ?, ?, 'OWNER', 'ACTIVE', ?, ?) ON CONFLICT(team_id, email) DO UPDATE SET account_id = excluded.account_id, display_name = excluded.display_name, status = 'ACTIVE', joined_at = COALESCE(team_members.joined_at, excluded.joined_at)`)
    .bind(crypto.randomUUID(), team.id, profile.profileId, profile.email, profile.displayName, now, now).run();
  await db.prepare(`UPDATE team_members SET account_id = (SELECT id FROM accounts WHERE accounts.email = team_members.email),
    display_name = COALESCE((SELECT display_name FROM accounts WHERE accounts.email = team_members.email), display_name),
    status = CASE WHEN EXISTS (SELECT 1 FROM accounts WHERE accounts.email = team_members.email) THEN 'ACTIVE' ELSE status END,
    joined_at = CASE WHEN joined_at IS NULL AND EXISTS (SELECT 1 FROM accounts WHERE accounts.email = team_members.email) THEN ? ELSE joined_at END
    WHERE team_id = ?`).bind(now, team.id).run();
  return team;
}

async function teamForViewer(user: AuthenticatedUser, allowOwnerCreation: boolean) {
  const current = await viewer(user); const db = database();
  let team = await db.prepare("SELECT id, name, owner_account_id, created_at FROM teams WHERE owner_account_id = ?").bind(current.profileId).first<TeamRow>();
  let viewerRole: "OWNER" | "MEMBER" = "OWNER";
  if (!team) {
    team = await db.prepare(`SELECT t.id, t.name, t.owner_account_id, t.created_at FROM teams t
      JOIN team_members m ON m.team_id = t.id WHERE m.account_id = ? AND m.role = 'MEMBER' AND m.status = 'ACTIVE'
      ORDER BY m.joined_at DESC LIMIT 1`).bind(current.profileId).first<TeamRow>();
    viewerRole = "MEMBER";
  }
  if (!team && allowOwnerCreation) { team = await ownerTeam(user); viewerRole = "OWNER"; }
  if (!team) throw new TeamServiceError("TEAM_NOT_FOUND", "You do not currently belong to a team.", 404);
  return { team, current, viewerRole };
}

export async function getTeamDashboard(user: AuthenticatedUser, options: { allowOwnerCreation?: boolean } = {}) {
  const { team, current, viewerRole } = await teamForViewer(user, Boolean(options.allowOwnerCreation)); const db = database();
  const memberResult = await db.prepare("SELECT id, email, display_name, role, status, invited_at, joined_at FROM team_members WHERE team_id = ? ORDER BY role, invited_at").bind(team.id).all<MemberRow>();
  const assignmentResult = await db.prepare(`SELECT id, repository_id, repository_name, incident_template_id, incident_name, assigned_to_email, created_at
    FROM team_assignments WHERE team_id = ? AND (? = 'OWNER' OR assigned_to_email = 'all' OR assigned_to_email = ?)
    ORDER BY created_at DESC LIMIT 100`).bind(team.id, viewerRole, current.email).all<AssignmentRow>();
  const repositoryResult = viewerRole === "OWNER" ? await db.prepare("SELECT id, name, display_ref, language, file_count FROM account_repositories WHERE account_id = ? ORDER BY updated_at DESC LIMIT 100").bind(team.owner_account_id).all<{ id: string; name: string; display_ref: string; language: string; file_count: number }>() : { results: [] };
  const resultRows = await db.prepare(`SELECT r.id, m.email AS member_email, m.display_name, r.incident_name, r.repository_name, r.score, r.duration_minutes, r.status, r.completed_at
    FROM team_members m JOIN account_rehearsals r ON r.account_id = m.account_id
    WHERE m.team_id = ? AND (? = 'OWNER' OR m.account_id = ?) ORDER BY r.completed_at DESC LIMIT 100`).bind(team.id, viewerRole, current.profileId).all<ResultRow>();
  const members = memberResult.results ?? [];
  return {
    viewer: { role: viewerRole, email: current.email, canManage: viewerRole === "OWNER" },
    team: { id: team.id, name: team.name, seatLimit: TEAM_SEAT_LIMIT, seatsUsed: members.filter(member => member.role === "MEMBER").length },
    members: members.map(member => ({ id: member.id, email: member.email, displayName: member.display_name, role: member.role, status: member.status, invitedAt: member.invited_at, joinedAt: member.joined_at })),
    assignments: (assignmentResult.results ?? []).map(item => ({ id: item.id, repositoryId: item.repository_id, repositoryName: item.repository_name, incidentTemplateId: item.incident_template_id, incidentName: item.incident_name, assignedToEmail: item.assigned_to_email, createdAt: item.created_at })),
    repositories: (repositoryResult.results ?? []).map(item => ({ id: item.id, name: item.name, displayRef: item.display_ref, language: item.language, fileCount: item.file_count })),
    results: (resultRows.results ?? []).map(item => ({ id: item.id, memberEmail: item.member_email, displayName: item.display_name, incidentName: item.incident_name, repositoryName: item.repository_name, score: item.score, durationMinutes: item.duration_minutes, status: item.status, completedAt: item.completed_at })),
  };
}

export async function getAssignedTeamWork(user: AuthenticatedUser) {
  await ensureTeamSchema();
  const profile = await viewer(user); const db = database();
  const result = await db.prepare(`SELECT a.id, t.name AS team_name, a.repository_id, a.repository_name, a.incident_template_id, a.incident_name, a.created_at
    FROM team_assignments a JOIN teams t ON t.id = a.team_id JOIN team_members m ON m.team_id = a.team_id
    WHERE m.email = ? AND m.status = 'ACTIVE' AND (a.assigned_to_email = 'all' OR a.assigned_to_email = m.email)
    ORDER BY a.created_at DESC LIMIT 50`).bind(profile.email).all<{ id: string; team_name: string; repository_id: string; repository_name: string; incident_template_id: string; incident_name: string; created_at: string }>();
  return (result.results ?? []).map(item => ({ id: item.id, teamName: item.team_name, repositoryId: item.repository_id, repositoryName: item.repository_name, incidentTemplateId: item.incident_template_id, incidentName: item.incident_name, createdAt: item.created_at }));
}

export async function leaveTeam(user: AuthenticatedUser, teamId: string) {
  const current = await viewer(user); const db = database();
  const result = await db.prepare("DELETE FROM team_members WHERE team_id = ? AND account_id = ? AND role = 'MEMBER'").bind(teamId, current.profileId).run();
  if (!result.meta?.changes) throw new TeamServiceError("MEMBERSHIP_NOT_FOUND", "Your team membership could not be found.", 404);
  return { left: true, teamId };
}

export async function canAccessAssignedRepository(user: { email: string; displayName: string }, repositoryId: string) {
  const current = await viewer(user); const row = await database().prepare(`SELECT a.id FROM team_assignments a
    JOIN teams t ON t.id = a.team_id
    JOIN team_members m ON m.team_id = a.team_id
    JOIN repositories r ON r.owner_account_id = t.owner_account_id AND r.id = ?
    WHERE m.account_id = ? AND m.role = 'MEMBER' AND m.status = 'ACTIVE'
      AND (a.repository_id = ? OR a.repository_id = 'all') LIMIT 1`).bind(repositoryId, current.profileId, repositoryId).first<{ id: string }>();
  return Boolean(row);
}

export async function inviteTeamMember(user: AuthenticatedUser, emailInput: string) {
  const team = await ownerTeam(user); const db = database(); const email = emailInput.trim().toLowerCase();
  if (email === user.email.toLowerCase()) throw new TeamServiceError("OWNER_ALREADY_MEMBER", "The team owner already has a seat.", 409);
  const existing = await db.prepare("SELECT id FROM team_members WHERE team_id = ? AND email = ?").bind(team.id, email).first<{ id: string }>();
  if (existing) throw new TeamServiceError("MEMBER_EXISTS", "That email is already on this team.", 409);
  const count = await db.prepare("SELECT COUNT(*) AS count FROM team_members WHERE team_id = ? AND role = 'MEMBER'").bind(team.id).first<{ count: number }>();
  if ((count?.count ?? 0) >= TEAM_SEAT_LIMIT) throw new TeamServiceError("SEAT_LIMIT_REACHED", "This Team subscription includes five invited members.", 409);
  const account = await db.prepare("SELECT id, display_name FROM accounts WHERE email = ?").bind(email).first<{ id: string; display_name: string }>();
  const now = new Date().toISOString();
  await db.prepare("INSERT INTO team_members (id, team_id, account_id, email, display_name, role, status, invited_at, joined_at) VALUES (?, ?, ?, ?, ?, 'MEMBER', ?, ?, ?)")
    .bind(crypto.randomUUID(), team.id, account?.id ?? null, email, account?.display_name ?? email.split("@")[0], account ? "ACTIVE" : "INVITED", now, account ? now : null).run();
  return getTeamDashboard(user);
}

export async function removeTeamMember(user: AuthenticatedUser, memberId: string) {
  const team = await ownerTeam(user); const result = await database().prepare("DELETE FROM team_members WHERE id = ? AND team_id = ? AND role = 'MEMBER'").bind(memberId, team.id).run();
  if (!result.meta?.changes) throw new TeamServiceError("MEMBER_NOT_FOUND", "That team member could not be found.", 404);
  return getTeamDashboard(user);
}

export async function createTeamAssignment(user: AuthenticatedUser, input: { repositoryId: string; incidentTemplateId: string; incidentName: string; assignedToEmail: string }) {
  const team = await ownerTeam(user); const db = database();
  let repositoryName = "All saved repositories";
  let incidentTemplateId = input.incidentTemplateId; let incidentName = input.incidentName;
  if (input.repositoryId === "challenge-of-the-day") { const daily = dailyChallenge(); repositoryName = "Challenge of the Day"; incidentTemplateId = daily.incident.id; incidentName = daily.incident.name; }
  else if (input.repositoryId !== "all") {
    const repository = await db.prepare("SELECT name FROM account_repositories WHERE id = ? AND account_id = ?").bind(input.repositoryId, team.owner_account_id).first<{ name: string }>();
    if (!repository) throw new TeamServiceError("REPOSITORY_NOT_FOUND", "Choose a repository from this team owner's library.", 404);
    repositoryName = repository.name;
  }
  if (input.assignedToEmail !== "all") {
    const member = await db.prepare("SELECT id FROM team_members WHERE team_id = ? AND email = ? AND role = 'MEMBER'").bind(team.id, input.assignedToEmail).first<{ id: string }>();
    if (!member) throw new TeamServiceError("MEMBER_NOT_FOUND", "Choose a member from this team.", 404);
  }
  const now = new Date().toISOString();
  await db.prepare("INSERT INTO team_assignments (id, team_id, repository_id, repository_name, incident_template_id, incident_name, assigned_to_email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), team.id, input.repositoryId, repositoryName, incidentTemplateId, incidentName, input.assignedToEmail, now).run();
  return getTeamDashboard(user);
}
