import { NextResponse } from "next/server";
import { z } from "zod";
import { createRehearsal } from "../../../src/rehearsals/session-service";
import { sessionRequest, rehearsalFailure } from "./_shared";
const schema=z.object({repositoryId:z.string().min(3).max(100),repositoryAccessToken:z.string().min(20).max(200).nullable().optional(),incidentTemplateId:z.string().min(3).max(100),difficulty:z.enum(["BEGINNER","INTERMEDIATE","ADVANCED"]),mode:z.enum(["GUIDED","INDEPENDENT","INTERVIEW"]),timeLimitMinutes:z.number().int().min(15).max(60)});
export async function POST(request:Request){try{const input=schema.safeParse(await request.json());if(!input.success)return NextResponse.json({error:{code:"INVALID_REHEARSAL",message:"Choose a supported repository, incident, difficulty, mode, and time limit."}},{status:400});const{user}=await sessionRequest(request);return NextResponse.json(await createRehearsal(user,input.data),{status:201})}catch(error){return rehearsalFailure(error)}}
