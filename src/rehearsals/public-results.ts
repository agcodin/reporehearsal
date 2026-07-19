import { runtimeDatabase } from "../storage/runtime";
import { getRehearsal, RehearsalError, type SessionUser } from "./session-service";
import type { RehearsalReport } from "./types";
import type { ValidationResult } from "../types";

type PublicResultRow = { id:string;session_id:string;repository_name:string;incident_name:string;score:number;duration_seconds:number;report_json:string;validation_json:string;completed_at:string;created_at:string };
export type PublicResult = { id:string;sessionId:string;repositoryName:string;incidentName:string;score:number;durationSeconds:number;report:RehearsalReport;validation:ValidationResult;completedAt:string;createdAt:string };

export async function ensurePublicResultSchema(){const db=runtimeDatabase();await db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS public_rehearsal_results (
    id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL UNIQUE, repository_name TEXT NOT NULL,
    incident_name TEXT NOT NULL, score INTEGER NOT NULL, duration_seconds INTEGER NOT NULL,
    report_json TEXT NOT NULL, validation_json TEXT NOT NULL, completed_at TEXT NOT NULL, created_at TEXT NOT NULL
  )`),
  db.prepare("CREATE INDEX IF NOT EXISTS public_rehearsal_results_created_idx ON public_rehearsal_results(created_at DESC)"),
]);}

function fromRow(row:PublicResultRow):PublicResult{return{id:row.id,sessionId:row.session_id,repositoryName:row.repository_name,incidentName:row.incident_name,score:row.score,durationSeconds:row.duration_seconds,report:JSON.parse(row.report_json) as RehearsalReport,validation:JSON.parse(row.validation_json) as ValidationResult,completedAt:row.completed_at,createdAt:row.created_at};}

export async function publishRehearsalResult(sessionId:string,user:SessionUser,token?:string|null){
  await ensurePublicResultSchema();const session=await getRehearsal(sessionId,user,token);
  if(session.status!=="COMPLETED"||!session.report||!session.validation||session.score===null)throw new RehearsalError("REPORT_NOT_READY","Only a completed rehearsal can be published.",409);
  const db=runtimeDatabase();const existing=await db.prepare("SELECT * FROM public_rehearsal_results WHERE session_id = ?").bind(sessionId).first<PublicResultRow>();if(existing)return fromRow(existing);
  const id=crypto.randomUUID();const completedAt=session.completedAt??new Date().toISOString();const durationSeconds=Math.max(0,Math.round((Date.parse(completedAt)-Date.parse(session.startedAt??session.createdAt))/1000));const now=new Date().toISOString();
  await db.prepare(`INSERT INTO public_rehearsal_results (id,session_id,repository_name,incident_name,score,duration_seconds,report_json,validation_json,completed_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .bind(id,sessionId,session.repositoryName,session.report.title.replace(/ — After-action report$/, ""),session.score,durationSeconds,JSON.stringify(session.report),JSON.stringify(session.validation),completedAt,now).run();
  return (await getPublicRehearsalResult(id))!;
}

export async function getPublicRehearsalResult(id:string){await ensurePublicResultSchema();const row=await runtimeDatabase().prepare("SELECT * FROM public_rehearsal_results WHERE id = ?").bind(id).first<PublicResultRow>();return row?fromRow(row):null;}
