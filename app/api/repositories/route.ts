import { NextResponse } from "next/server"; import { repositoryMap } from "../../../src/data";
export async function GET(){return NextResponse.json({repositories:[repositoryMap]})}
