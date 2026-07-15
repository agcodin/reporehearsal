import { NextResponse } from "next/server"; import { repositoryMap } from "../../../../src/data";
export async function POST(){return NextResponse.json({repository:repositoryMap,created:false},{status:200})}
