import { runtimeDatabase } from "../storage/runtime";
import type { RehearsalSession } from "../rehearsals/types";

export type FunnelEvent = "created" | "prepared" | "started" | "evidence" | "edited" | "command" | "completed" | "expired";

async function ensureSchema() {
  await runtimeDatabase().prepare(`CREATE TABLE IF NOT EXISTS rehearsal_funnels (
    session_id TEXT PRIMARY KEY NOT NULL, owner_account_id TEXT, incident_template_id TEXT NOT NULL,
    repository_id TEXT NOT NULL, repository_name TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'Unknown',
    created_at TEXT NOT NULL, started_at TEXT, completed_at TEXT, last_event TEXT NOT NULL, last_event_at TEXT NOT NULL,
    evidence_count INTEGER NOT NULL DEFAULT 0, edit_count INTEGER NOT NULL DEFAULT 0, command_count INTEGER NOT NULL DEFAULT 0,
    score INTEGER
  )`).run();
}

export async function trackRehearsalFunnel(session: Pick<RehearsalSession,"id"|"ownerAccountId"|"incidentTemplateId"|"repositoryId"|"repositoryName"|"createdAt">, event: FunnelEvent, options: { language?: string; score?: number } = {}) {
  await ensureSchema(); const now = new Date().toISOString();
  await runtimeDatabase().prepare(`INSERT INTO rehearsal_funnels (session_id, owner_account_id, incident_template_id, repository_id, repository_name, language, created_at, started_at, completed_at, last_event, last_event_at, evidence_count, edit_count, command_count, score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      last_event=excluded.last_event, last_event_at=excluded.last_event_at,
      language=CASE WHEN excluded.language='Unknown' THEN rehearsal_funnels.language ELSE excluded.language END,
      started_at=COALESCE(rehearsal_funnels.started_at, excluded.started_at), completed_at=COALESCE(excluded.completed_at, rehearsal_funnels.completed_at),
      evidence_count=rehearsal_funnels.evidence_count + excluded.evidence_count,
      edit_count=rehearsal_funnels.edit_count + excluded.edit_count,
      command_count=rehearsal_funnels.command_count + excluded.command_count,
      score=COALESCE(excluded.score, rehearsal_funnels.score)`)
    .bind(session.id,session.ownerAccountId,session.incidentTemplateId,session.repositoryId,session.repositoryName,options.language??"Unknown",session.createdAt,event==="started"?now:null,event==="completed"?now:null,event,now,event==="evidence"?1:0,event==="edited"?1:0,event==="command"?1:0,options.score??null).run();
}

export async function getTeamFunnelAnalytics(teamId: string) {
  await ensureSchema(); const db=runtimeDatabase();
  const summary=await db.prepare(`SELECT COUNT(*) total, SUM(CASE WHEN f.completed_at IS NOT NULL THEN 1 ELSE 0 END) completed,
    SUM(CASE WHEN f.started_at IS NOT NULL AND f.completed_at IS NULL THEN 1 ELSE 0 END) abandoned,
    COUNT(DISTINCT CASE WHEN f.completed_at IS NOT NULL THEN f.incident_template_id END) incident_types
    FROM rehearsal_funnels f JOIN team_members m ON m.account_id=f.owner_account_id WHERE m.team_id=?`).bind(teamId).first<{total:number;completed:number;abandoned:number;incident_types:number}>();
  const groups=await db.prepare(`SELECT f.incident_template_id incident, f.language, COUNT(*) attempts,
    SUM(CASE WHEN f.completed_at IS NOT NULL THEN 1 ELSE 0 END) completed,
    SUM(CASE WHEN f.started_at IS NOT NULL AND f.completed_at IS NULL THEN 1 ELSE 0 END) abandoned
    FROM rehearsal_funnels f JOIN team_members m ON m.account_id=f.owner_account_id WHERE m.team_id=?
    GROUP BY f.incident_template_id,f.language ORDER BY attempts DESC LIMIT 30`).bind(teamId).all<{incident:string;language:string;attempts:number;completed:number;abandoned:number}>();
  const replays=await db.prepare(`SELECT COUNT(*) count FROM (SELECT f.owner_account_id,f.incident_template_id,COUNT(*) n FROM rehearsal_funnels f JOIN team_members m ON m.account_id=f.owner_account_id WHERE m.team_id=? GROUP BY f.owner_account_id,f.incident_template_id HAVING n>1)`).bind(teamId).first<{count:number}>();
  return { total:Number(summary?.total??0), completed:Number(summary?.completed??0), abandoned:Number(summary?.abandoned??0), replayedTracks:Number(replays?.count??0), groups:groups.results??[] };
}
