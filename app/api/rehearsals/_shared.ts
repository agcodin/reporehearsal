import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";
import { RehearsalError, type SessionUser } from "../../../src/rehearsals/session-service";
import { consumeRateLimit, RateLimitError } from "../../../src/security/rate-limit";

export async function sessionRequest(request:Request):Promise<{user:SessionUser;token:string|null}>{await consumeRateLimit(request,"rehearsals",120,60);const user=await getChatGPTUser();return{user:user?{email:user.email,displayName:user.displayName}:null,token:request.headers.get("x-rehearsal-access")}}
export function rehearsalFailure(error:unknown){if(error instanceof RateLimitError)return NextResponse.json({error:{code:"RATE_LIMITED",message:error.message}},{status:429,headers:{"Retry-After":String(error.retryAfter)}});if(error instanceof RehearsalError)return NextResponse.json({error:{code:error.code,message:error.message}},{status:error.status});console.error("Rehearsal request failed",error instanceof Error?error.message:"unknown");return NextResponse.json({error:{code:"REHEARSAL_FAILED",message:"The rehearsal request could not be completed."}},{status:500})}
