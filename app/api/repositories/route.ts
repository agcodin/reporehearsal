import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";
import { listRepositories } from "../../../src/repositories/repository-service";
export async function GET(){const user=await getChatGPTUser();const repositories=await listRepositories(user?{email:user.email,displayName:user.displayName}:null);return NextResponse.json({repositories:repositories.map(repository=>({id:repository.id,name:repository.name,source:repository.source,fileCount:repository.fileCount,analysis:repository.analysis,createdAt:repository.createdAt}))})}
