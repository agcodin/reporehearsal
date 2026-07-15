import { NextResponse } from "next/server"; import { repositoryMap } from "../../../../src/data";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;if(id!==repositoryMap.repositoryId)return NextResponse.json({error:{code:"NOT_FOUND",message:"Repository not found"}},{status:404});return NextResponse.json({repository:repositoryMap})}
