import { NextResponse } from "next/server";
import { publishRehearsalResult } from "../../../../../src/rehearsals/public-results";
import { rehearsalFailure, sessionRequest } from "../../_shared";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const{id}=await params;const{user,token}=await sessionRequest(request);const result=await publishRehearsalResult(id,user,token);return NextResponse.json({result,verifyPath:`/verify/${result.id}`});}catch(error){return rehearsalFailure(error)}}
