import { NextResponse } from "next/server";
export async function GET(){return NextResponse.json({session:{id:"demo",status:"ACTIVE",repositoryId:"billing-demo",incidentTemplateId:"db-required-field-migration-v1",mode:"GUIDED",difficulty:"INTERMEDIATE",expiresAt:new Date(Date.now()+45*60_000).toISOString()}})}
