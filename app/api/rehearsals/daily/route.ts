import { NextResponse } from "next/server";
import { createRehearsal } from "../../../../src/rehearsals/session-service";
import { dailyChallenge } from "../../../../src/rehearsals/daily";
import { sessionRequest, rehearsalFailure } from "../_shared";

export async function GET() { const challenge = dailyChallenge(); return NextResponse.json({ challenge: { ...challenge, incident: { id: challenge.incident.id, name: challenge.incident.name, summary: challenge.incident.summary, category: challenge.incident.category } } }); }
export async function POST(request: Request) { try { const { user } = await sessionRequest(request); const challenge = dailyChallenge(); return NextResponse.json(await createRehearsal(user, { repositoryId: challenge.repositoryId, incidentTemplateId: challenge.incident.id, difficulty: challenge.difficulty, mode: challenge.mode, timeLimitMinutes: challenge.timeLimitMinutes }), { status: 201 }); } catch (error) { return rehearsalFailure(error); } }
