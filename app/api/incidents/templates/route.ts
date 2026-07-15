import { NextResponse } from "next/server"; import { incidents } from "../../../../src/data";
export async function GET(){return NextResponse.json({templates:incidents})}
